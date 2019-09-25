import { MLToolkit } from 'botpress/sdk'
import _, { cloneDeep } from 'lodash'

import jaroDistance from './pipelines/entities/jaro'
import levenDistance from './pipelines/entities/levenshtein'
import tfidf from './pipelines/intents/tfidf'
import { getClosestToken } from './pipelines/language/ft_featurizer'
import LanguageIdentifierProvider, { NA_LANG } from './pipelines/language/ft_lid'
import CRFExtractor2 from './pipelines/slots/crf-extractor2'
import { computeNorm, scalarDivide, vectorAdd } from './tools/math'
import { extractPattern } from './tools/patterns-utils'
import { replaceConsecutiveSpaces } from './tools/strings'
import { isSpace, isWord, SPACE } from './tools/token-utils'
import { EntityExtractor, Token2Vec } from './typings'
import { parseUtterance } from './utterance-parser'

// TODOS
// ----- split svm l0 & l1 ----
//          election process (do the same as what we had in svm classification (lognormal shit))
//          ambiguity ranking
//          make sure results are same (context = l0, intents = l1)
//          add exact matcher
//          hard filter threshold ?
//          use the elected intent to extract the slots
// ----- load models -----
//      load everything from artefacts
//      run pre-training steps in pipeline
//      load tfidf
//      load context model
//      load intent model
//      load kmeans
//      load crfModel
// ----- partial cleanup -----
//      extract kmeans in engine2 out of CRF
//      check if predict tools can be refactored to pretty much nothing
// ----- persist models -----
//      keep only serializable stuff in artefacts
//      keep state of svms and kmeans and all that stuff in engine2
// ----- cancelation token -----

const NONE_INTENT = 'none'

export default class Engine2 {
  private tools: TrainTools

  provideTools = (tools: TrainTools) => {
    this.tools = tools
  }

  async train(input: StructuredTrainInput): Promise<Model> {
    const token: CancellationToken = {
      // TODO:
      cancel: async () => {},
      uid: '',
      isCancelled: () => false,
      cancelledAt: new Date()
    }

    // TODO load stateful models and keep them in memory to pass to predict pipeline
    return Trainer(input, this.tools, token)
  }
}

export type StructuredTrainInput = Readonly<{
  botId: string
  languageCode: string
  pattern_entities: PatternEntity[]
  list_entities: ListEntity[]
  contexts: string[]
  intents: Intent<string>[]
}>

export type StructuredTrainOutput = Readonly<{
  botId: string
  languageCode: string
  pattern_entities: PatternEntity[]
  list_entities: ListEntityModel[]
  contexts: string[]
  intents: Intent<Utterance>[]
  tfIdf: _.Dictionary<number>
}>

export type PatternEntity = Readonly<{
  name: string
  pattern: string
  examples: string[]
  ignoreCase: boolean
  sensitive: boolean
}>

export type ListEntity = Readonly<{
  name: string
  synonyms: { [canonical: string]: string[] }
  fuzzyMatching: boolean
  sensitive: boolean
}>

export type Intent<T> = Readonly<{
  name: string
  contexts: string[]
  slot_definitions: SlotDefinition[]
  utterances: T[]
  vocab: _.Dictionary<boolean>
  slot_entities: string[]
}>

export type SlotDefinition = Readonly<{
  name: string
  entities: string[]
}>

export type ListEntityModel = Readonly<{
  type: 'custom.list'
  id: string
  languageCode: string
  entityName: string
  fuzzyMatching: boolean
  sensitive: boolean
  /** @example { 'Air Canada': [ ['Air', '_Canada'], ['air', 'can'] ] } */
  mappingsTokens: _.Dictionary<string[][]>
}>

export type Utterance = Readonly<{
  toString(options?: UtteranceToStringOptions): string
  tagEntity(entity: ExtractedEntity, start: number, end: number)
  tagSlot(slot: ExtractedSlot, start: number, end: number)
  setGlobalTfidf(tfidf: _.Dictionary<number>)
  entities: ReadonlyArray<UtteranceRange & UtteranceEntity>
  slots: ReadonlyArray<UtteranceRange & UtteranceSlot>
  tokens: ReadonlyArray<UtteranceToken>
}>

export const prepareListEntityModels = async (entity: ListEntity, languageCode: string, tools: TrainTools) => {
  const allValues = _.uniq(Object.keys(entity.synonyms).concat(..._.values(entity.synonyms)))
  const allTokens = await tools.tokenize_utterances(allValues, languageCode)

  return <ListEntityModel>{
    type: 'custom.list',
    id: `custom.list.${entity.name}`,
    languageCode: languageCode,
    entityName: entity.name,
    fuzzyMatching: entity.fuzzyMatching,
    sensitive: entity.sensitive,
    mappingsTokens: _.mapValues(entity.synonyms, (synonyms, name) =>
      [...synonyms, name].map(syn => {
        const idx = allValues.indexOf(syn)
        return allTokens[idx]
      })
    )
  }
}

export const takeUntil = (
  arr: ReadonlyArray<UtteranceToken>,
  start: number,
  desiredLength: number
): ReadonlyArray<UtteranceToken> => {
  let total = 0
  const result = _.takeWhile(arr.slice(start), t => {
    const toAdd = t.toString().length
    const current = total
    if (current > 0 && Math.abs(desiredLength - current) < Math.abs(desiredLength - current - toAdd)) {
      // better off as-is
      return false
    } else {
      // we're closed to desired if we add a new token
      total += toAdd
      return current < desiredLength
    }
  })
  if (result[result.length - 1].isSpace) {
    result.pop()
  }
  return result
}

export type EntityExtractionResult = ExtractedEntity & { start: number; end: number }
export const extractListEntities = (
  utterance: Utterance,
  list_entities: ListEntityModel[]
): EntityExtractionResult[] => {
  //
  const exactScore = (a: string[], b: string[]): number => {
    const str1 = a.join('')
    const str2 = b.join('')
    const min = Math.min(str1.length, str2.length)
    const max = Math.max(str1.length, str2.length)
    let score = 0
    for (let i = 0; i < min; i++) {
      if (str1[i] === str2[i]) {
        score++
      }
    }
    return score / max
  }
  //
  const fuzzyScore = (a: string[], b: string[]): number => {
    const str1 = a.join('')
    const str2 = b.join('')
    const d1 = levenDistance(str1, str2)
    const d2 = jaroDistance(str1, str2, { caseSensitive: false })
    return (d1 + d2) / 2
  }
  //
  const structuralScore = (a: string[], b: string[]): number => {
    const charset1 = _.uniq(_.flatten(a.map(x => x.split(''))))
    const charset2 = _.uniq(_.flatten(b.map(x => x.split(''))))
    const charset_score = _.intersection(charset1, charset2).length / _.union(charset1, charset2).length

    const la = Math.max(1, a.filter(x => x.length > 1).length)
    const lb = Math.max(1, a.filter(x => x.length > 1).length)
    const token_qty_score = Math.min(la, lb) / Math.max(la, lb)

    const size1 = _.sumBy(a, 'length')
    const size2 = _.sumBy(b, 'length')
    const token_size_score = Math.min(size1, size2) / Math.max(size1, size2)

    return Math.sqrt(charset_score * token_qty_score * token_size_score)
  }

  const matches: EntityExtractionResult[] = []

  for (const list of list_entities) {
    const candidates = []
    let longestCandidate = 0

    for (const [canonical, occurances] of _.toPairs(list.mappingsTokens)) {
      for (const occurance of occurances) {
        for (let i = 0; i < utterance.tokens.length; i++) {
          if (utterance.tokens[i].isSpace) {
            continue
          }
          const workset = takeUntil(utterance.tokens, i, _.sumBy(occurance, 'length'))
          const worksetAsStrings = workset.map(x => x.toString({ lowerCase: true, realSpaces: true, trim: false }))
          const candidateAsString = occurance.join('')

          if (candidateAsString.length > longestCandidate) {
            longestCandidate = candidateAsString.length
          }

          const fuzzy = list.fuzzyMatching && worksetAsStrings.join('').length >= 4
          const exact_score = exactScore(worksetAsStrings, occurance) === 1 ? 1 : 0
          const fuzzy_score = fuzzyScore(worksetAsStrings, occurance)
          const structural_score = structuralScore(worksetAsStrings, occurance)
          const finalScore = fuzzy ? fuzzy_score * structural_score : exact_score * structural_score

          candidates.push({
            score: Math.round(finalScore * 1000) / 1000,
            canonical,
            start: i,
            end: i + workset.length - 1,
            source: worksetAsStrings.join(''),
            occurance: occurance.join(''),
            eliminated: false
          })
        }
      }

      for (let i = 0; i < utterance.tokens.length; i++) {
        const results = _.orderBy(
          candidates.filter(x => !x.eliminated && x.start <= i && x.end >= i),
          // we want to favor longer matches (but is obviously less important than score)
          // so we take its length into account (up to the longest candidate)
          x => x.score * Math.pow(Math.min(x.source.length, longestCandidate), 1 / 5),
          'desc'
        )
        if (results.length > 1) {
          const [, ...losers] = results
          losers.forEach(x => (x.eliminated = true))
        }
      }
    }

    candidates
      .filter(x => !x.eliminated && x.score >= 0.6)
      .forEach(match => {
        matches.push({
          confidence: match.score,
          start: utterance.tokens[match.start].offset,
          end: utterance.tokens[match.end].offset + utterance.tokens[match.end].value.length,
          value: match.canonical,
          metadata: {
            source: match.source,
            occurance: match.occurance,
            entityId: list.id
          },
          type: list.entityName
        })
      })
  }

  return matches
}

// TODO test this
export const extractPatternEntities = (
  utterance: Utterance,
  pattern_entities: PatternEntity[]
): EntityExtractionResult[] => {
  const input = utterance.toString()
  // taken from pattern_extractor
  return _.flatMap(pattern_entities, ent => {
    const regex = new RegExp(ent.pattern!, 'i')

    return extractPattern(input, regex, []).map(res => ({
      confidence: 1,
      start: Math.max(0, res.sourceIndex),
      end: Math.min(input.length, res.sourceIndex + res.value.length),
      value: res.value,
      metadata: {
        source: res.value,
        entityId: `custom.pattern.${ent.name}`
      },
      type: ent.name
    }))
  })
}

export const extractSystemEntities = async (
  utterance: Utterance,
  languageCode: string,
  tools: TrainTools | PreditcTools
): Promise<EntityExtractionResult[]> => {
  const extracted = await tools.ducklingExtractor.extract(utterance.toString(), languageCode)
  return extracted.map(ent => ({
    confidence: ent.meta.confidence,
    start: ent.meta.start,
    end: ent.meta.end,
    value: ent.data.value,
    metadata: {
      source: ent.meta.source,
      entityId: `system.${ent.name}`,
      unit: ent.data.unit
    },
    type: ent.name
  }))
}

export class UtteranceClass implements Utterance {
  public slots: ReadonlyArray<UtteranceRange & UtteranceSlot> = []
  public entities: ReadonlyArray<UtteranceRange & UtteranceEntity> = []
  private _tokens: ReadonlyArray<UtteranceToken> = []
  private _globalTfidf?: _.Dictionary<number>

  setGlobalTfidf(tfidf: _.Dictionary<number>) {
    this._globalTfidf = tfidf
  }

  constructor(tokens: string[], vectors: number[][]) {
    if (tokens.length !== vectors.length) {
      throw Error('Tokens and vectors must match')
    }

    const arr = []
    for (let i = 0, offset = 0; i < tokens.length; i++) {
      const that = this
      const value = tokens[i]
      arr.push(
        Object.freeze({
          index: i,
          isBOS: i === 0,
          isEOS: i === tokens.length - 1,
          isWord: isWord(value),
          offset: offset,
          get slots(): ReadonlyArray<UtteranceRange & ExtractedSlot> {
            return that.slots.filter(x => x.startTokenIdx <= i && x.endTokenIdx >= i)
          },
          get entities(): ReadonlyArray<UtteranceRange & ExtractedEntity> {
            return that.entities.filter(x => x.startTokenIdx <= i && x.endTokenIdx >= i)
          },
          isSpace: isSpace(value),
          get tfidf(): number {
            return (that._globalTfidf && that._globalTfidf[value]) || 1
          },
          value: value,
          vectors: vectors[i],
          toString: (opts: TokenToStringOptions) => {
            const options = { ...DefaultTokenToStringOptions, ...opts }
            let result = value
            if (options.lowerCase) {
              result = result.toLowerCase()
            }
            if (options.realSpaces) {
              result = result.replace(new RegExp(SPACE, 'g'), ' ')
            }
            if (options.trim) {
              result = result.trim()
            }
            return result
          }
        })
      )
      offset += value.length
    }
    this._tokens = arr
  }

  get tokens(): ReadonlyArray<UtteranceToken> {
    return this._tokens
  }

  toString(options: UtteranceToStringOptions): string {
    const opts: UtteranceToStringOptions = _.defaultsDeep({}, options, <UtteranceToStringOptions>{
      lowerCase: false,
      slots: 'keep-value'
    })

    let final = ''
    let ret = [...this.tokens]
    if (opts.onlyWords) {
      ret = ret.filter(tok => tok.slots.length || tok.isWord)
    }

    for (const tok of ret) {
      if (tok.slots.length && opts.slots === 'keep-slot-name') {
        final += tok.slots[0].name
      } else {
        final += tok.value
      }
    }

    if (opts.lowerCase) {
      final = final.toLowerCase()
    }

    return final.replace(new RegExp(SPACE, 'g'), ' ')
  }

  clone(copyEntities: boolean, copySlots: boolean): UtteranceClass {
    const tokens = this.tokens.map(x => x.value)
    const vectors = this.tokens.map(x => <number[]>x.vectors)
    const utterance = new UtteranceClass(tokens, vectors)
    utterance.setGlobalTfidf({ ...this._globalTfidf })

    if (copyEntities) {
      this.entities.forEach(entity => utterance.tagEntity(entity, entity.startPos, entity.endPos))
    }

    if (copySlots) {
      this.slots.forEach(slot => utterance.tagSlot(slot, slot.startPos, slot.endPos))
    }

    return utterance
  }

  tagEntity(entity: ExtractedEntity, start: number, end: number) {
    const range = this.tokens.filter(x => x.offset >= start && x.offset + x.value.length <= end)
    this.entities = [
      ...this.entities,
      {
        ...entity,
        startPos: start,
        endPos: end,
        startTokenIdx: _.first(range).index,
        endTokenIdx: _.last(range).index
      }
    ]
  }

  tagSlot(slot: ExtractedSlot, start: number, end: number) {
    const range = this.tokens.filter(x => x.offset >= start && x.offset + x.value.length <= end)
    this.slots = [
      ...this.slots,
      {
        ...slot,
        startPos: start,
        endPos: end,
        startTokenIdx: _.first(range).index,
        endTokenIdx: _.last(range).index
      }
    ]
  }
}

export type UtteranceToStringOptions = {
  lowerCase: boolean
  onlyWords: boolean
  slots: 'keep-value' | 'keep-slot-name'
}

export type TokenToStringOptions = {
  lowerCase?: boolean
  trim?: boolean
  realSpaces?: boolean
}

export type UtteranceRange = { startTokenIdx: number; endTokenIdx: number; startPos: number; endPos: number }
export type ExtractedEntity = { confidence: number; type: string; metadata: any; value: string }
export type ExtractedSlot = { confidence: number; name: string; source: any }
export type UtteranceEntity = Readonly<UtteranceRange & ExtractedEntity>
export type UtteranceSlot = Readonly<UtteranceRange & ExtractedSlot>
export type UtteranceToken = Readonly<{
  index: number
  value: string
  isWord: boolean
  isSpace: boolean
  isBOS: boolean
  isEOS: boolean
  vectors: ReadonlyArray<number>
  tfidf: number
  offset: number
  entities: ReadonlyArray<UtteranceRange & ExtractedEntity>
  slots: ReadonlyArray<UtteranceRange & ExtractedSlot>
  toString(options?: TokenToStringOptions): string
}>

export const DefaultTokenToStringOptions: TokenToStringOptions = { lowerCase: false, realSpaces: true, trim: false }

export interface Trainer {
  (input: StructuredTrainInput, tools: TrainTools, cancelToken: CancellationToken): Promise<Model>
}

// @ts-ignore
export const Trainer: Trainer = async (input, tools, cancelToken): Promise<Model> => {
  const startedAt = new Date()
  try {
    // TODO: Cancellation token effect
    input = cloneDeep(input)

    const list_entities = await Promise.map(input.list_entities, list =>
      prepareListEntityModels(list, input.languageCode, tools)
    )

    // TODO filter out non trainable intents (see engine 1 filtering conditions)
    const intents = await ProcessIntents(input.intents, input.languageCode, tools)

    let output = {
      ..._.omit(input, 'list_entities', 'intents'),
      list_entities,
      intents,
      tfIdf: {}
    }

    output = await ExtractEntities(output, tools)
    output = await TfidfTokens(output)
    output = await AppendNoneIntents(output, tools)

    const ctx_classifier = await trainContextClassifier(output, tools)
    const intent_classifier_per_ctx = await trainIntentClassifer(output, tools)

    const slot_tagger = await trainSlotTagger(output, tools)
    const finishedAt = new Date()

    // only serializable stuff in here
    const artefacts = {
      list_entities,
      tfidf: output.tfIdf,
      kmeans: {}, // TODO move kmeans out of crf extractor and pass it instead
      exact_classifier: {},
      ctx_classifier,
      intent_classifier_per_ctx,
      slot_tagger, // TODO this is not an artefact and should be the serialized version of CRF
      vocabVectors: vectorsVocab(output.intents) // TODO something better with this ? maybe build this as 1st step of predict pipeline
    }

    return {
      startedAt,
      finishedAt,
      inputData: input,
      languageCode: input.languageCode,
      outputData: output,
      artefacts,
      success: true
    }
  } catch (err) {
    return {
      startedAt,
      finishedAt: new Date(),
      success: false,
      inputData: input,
      languageCode: input.languageCode
    }
  }
}

// TODO test this (build intent vocab)
export const buildIntentVocab = (utterances: Utterance[]): _.Dictionary<boolean> => {
  return _.chain(utterances)
    .flatMap(u => u.tokens)
    .reduce((vocab: _.Dictionary<boolean>, tok) => ({ ...vocab, [tok.toString({ lowerCase: true })]: true }), {})
    .value()
}

const vectorsVocab = (intents: Intent<Utterance>[]): _.Dictionary<number[]> => {
  return _.chain(intents)
    .filter(i => i.name !== NONE_INTENT)
    .flatMapDeep((intent: Intent<Utterance>) => intent.utterances.map(u => u.tokens))
    .reduce(
      // @ts-ignore
      (vocab, tok: UtteranceToken) => ({ ...vocab, [tok.toString({ lowerCase: true })]: tok.vectors }),
      {} as Token2Vec
    )
    .value()
}

// TODO vectorized implementation of this
// taken as is from ft_featurizer
// Taken from https://github.com/facebookresearch/fastText/blob/26bcbfc6b288396bd189691768b8c29086c0dab7/src/fasttext.cc#L486s
const computeSentenceEmbedding = (utterance: Utterance): number[] => {
  let totalWeight = 0
  let sentenceEmbedding = new Array(utterance.tokens[0].vectors.length).fill(0)

  for (const token of utterance.tokens) {
    const norm = computeNorm(token.vectors)
    if (norm <= 0) {
      continue
    }
    totalWeight += token.tfidf
    const weightedVec = scalarDivide(token.vectors as number[], norm / token.tfidf)
    sentenceEmbedding = vectorAdd(sentenceEmbedding, weightedVec)
  }

  return scalarDivide(sentenceEmbedding, totalWeight)
}

export const trainIntentClassifer = async (
  input: StructuredTrainOutput,
  tools: TrainTools
): Promise<_.Dictionary<string>> => {
  const svmPerCtx: _.Dictionary<string> = {}
  for (const ctx of input.contexts) {
    const points = _.chain(input.intents)
      .filter(i => i.contexts.includes(ctx))
      .flatMap(i =>
        i.utterances.map(utt => ({
          label: i.name,
          coordinates: computeSentenceEmbedding(utt)
        }))
      )
      .value()

    const svm = new tools.mlToolkit.SVM.Trainer({ kernel: 'LINEAR', classifier: 'C_SVC' })
    await svm.train(points, progress => {
      console.log('svm progress ==>', progress)
    }) // TODO progress & cancellation callback
    svmPerCtx[ctx] = svm.serialize()
  }

  return svmPerCtx
}

export const trainContextClassifier = async (input: StructuredTrainOutput, tools: TrainTools): Promise<string> => {
  const points = _.flatMapDeep(input.contexts, ctx => {
    return input.intents
      .filter(intent => intent.contexts.includes(ctx) && intent.name !== NONE_INTENT)
      .map(intent =>
        intent.utterances.map(utt => ({
          label: ctx,
          coordinates: computeSentenceEmbedding(utt)
        }))
      )
  })

  const svm = new tools.mlToolkit.SVM.Trainer({ kernel: 'LINEAR', classifier: 'C_SVC' })
  await svm.train(points, progress => console.log('SVM => progress for CTX %d', progress))

  return svm.serialize()
}

export const ProcessIntents = async (
  intents: Intent<string>[],
  languageCode: string,
  tools: TrainTools
): Promise<Intent<Utterance>[]> => {
  return Promise.map(intents, async intent => {
    const cleaned = intent.utterances.map(replaceConsecutiveSpaces)
    const utterances = await Utterances(cleaned, languageCode, tools)

    // make this a function ?
    // can should we use the vector map ?
    const vocab = buildIntentVocab(utterances)
    const slot_entities = _.chain(intent.slot_definitions)
      .flatMap(s => s.entities)
      .uniq()
      .value()

    return { ...intent, utterances: utterances, vocab, slot_entities }
  })
}

export const ExtractEntities = async (
  input: StructuredTrainOutput,
  tools: TrainTools
): Promise<StructuredTrainOutput> => {
  for (const intent of input.intents) {
    intent.utterances.forEach(async utterance => await extractUtteranceEntities(utterance, input, tools))
  }

  return input
}

const extractUtteranceEntities = async (
  utterance: Utterance,
  input: StructuredTrainOutput | PredictOutput,
  tools: TrainTools | PreditcTools
) => {
  const extractedEntities = [
    ...extractListEntities(utterance, input.list_entities),
    ...extractPatternEntities(utterance, input.pattern_entities),
    ...(await extractSystemEntities(utterance, input.languageCode, tools))
  ] as EntityExtractionResult[]

  extractedEntities.forEach(entityRes => {
    utterance.tagEntity(_.omit(entityRes, ['start, end']), entityRes.start, entityRes.end)
  })
}

export const AppendNoneIntents = async (
  input: StructuredTrainOutput,
  tools: TrainTools
): Promise<StructuredTrainOutput> => {
  const allUtterances = _.flatten(input.intents.map(x => x.utterances))

  const vocabulary = _.chain(allUtterances)
    .map(x => x.tokens.map(x => x.value))
    .flattenDeep<string>()
    .uniq()
    .value()

  const junkWords = await tools.generateSimilarJunkWords(vocabulary)
  const avgUtterances = _.meanBy(input.intents, x => x.utterances.length)
  const avgTokens = _.meanBy(allUtterances, x => x.tokens.length)
  const nbOfNoneUtterances = Math.max(5, avgUtterances)

  // If 50% of words start with a space, we know this language is probably space-separated, and so we'll join tokens using spaces
  const joinChar = vocabulary.filter(x => x.startsWith(SPACE)).length >= vocabulary.length * 0.5 ? SPACE : ''

  const noneUtterances = _.range(0, nbOfNoneUtterances).map(() => {
    const nbWords = _.random(avgTokens / 2, avgTokens * 2, false)
    return _.sampleSize(junkWords, nbWords).join(joinChar)
  })

  const intent: Intent<Utterance> = {
    name: NONE_INTENT,
    slot_definitions: [],
    utterances: await Utterances(noneUtterances, input.languageCode, tools),
    contexts: [...input.contexts],
    vocab: {},
    slot_entities: []
  }

  return { ...input, intents: [...input.intents, intent] }
}

export const TfidfTokens = async (input: StructuredTrainOutput): Promise<StructuredTrainOutput> => {
  const tfidfInput = input.intents.reduce(
    (tfidfInput, intent) => ({
      ...tfidfInput,
      [intent.name]: _.flatMapDeep(intent.utterances.map(u => u.tokens.map(t => t.toString({ lowerCase: true }))))
    }),
    {} as _.Dictionary<string[]>
  )

  const { __avg__: avg_tfidf } = tfidf(tfidfInput)
  const copy = { ...input, tfIdf: avg_tfidf }
  copy.intents.forEach(x => x.utterances.forEach(u => u.setGlobalTfidf(avg_tfidf)))
  return copy
}

export type UtteranceChunk = {
  value: string
  slotIdx?: number
  slotName?: string
  entities?: string[]
}

const Utterances = async (
  raw_utterances: string[],
  languageCode: string,
  tools: TrainTools | PreditcTools
): Promise<Utterance[]> => {
  const parsed = raw_utterances.map(u => parseUtterance(replaceConsecutiveSpaces(u)))
  const tokens = await tools.tokenize_utterances(parsed.map(p => p.utterance), languageCode)
  const uniqTokens = _.uniq(_.flatten(tokens))
  const vectors = await tools.vectorize_tokens(uniqTokens, languageCode)
  const vectorMap = _.zipObject(uniqTokens, vectors)

  return _.zip(tokens, parsed).map(([tokUtt, { parsedSlots }]) => {
    const vectors = tokUtt.map(t => vectorMap[t])
    const utterance = new UtteranceClass(tokUtt, vectors)
    parsedSlots.forEach(s => {
      utterance.tagSlot({ name: s.name, source: s.value, confidence: 1 }, s.cleanPosition.start, s.cleanPosition.end)
    })

    return utterance
  })
}

// TODO declare type for SlotTagger {train, predict, serialized}
const trainSlotTagger = async (input: StructuredTrainOutput, tools: TrainTools): Promise<CRFExtractor2> => {
  const crfExtractor = new CRFExtractor2(tools.mlToolkit)
  await crfExtractor.train(input.intents)

  return crfExtractor
}

export interface TrainArtefacts {
  list_entities: ListEntityModel[]
  tfidf: _.Dictionary<number>
  vocabVectors: Token2Vec
  kmeans: any // TODO fix this
  context_ranking: any // TODO fix this
  exact_classifier: any // TODO fix this
  intent_classifier: any // TODO fix this
  slot_tagger: CRFExtractor2
}

export interface CancellationToken {
  readonly uid: string
  isCancelled(): boolean
  cancelledAt: Date
  cancel(): Promise<void>
}

export interface TrainTools {
  tokenize_utterances(utterances: string[], languageCode: string): Promise<string[][]>
  vectorize_tokens(tokens: string[], languageCode: string): Promise<number[][]>
  generateSimilarJunkWords(vocabulary: string[]): Promise<string[]>
  ducklingExtractor: EntityExtractor
  mlToolkit: typeof MLToolkit
}

export type PreditcTools = Omit<TrainTools, 'generateSimilarJunkWords'>

export interface Model {
  languageCode: string
  inputData: StructuredTrainInput
  outputData?: StructuredTrainOutput
  startedAt: Date
  finishedAt: Date
  success: boolean
  artefacts?: TrainArtefacts
}

// TODO include loaded models / predictors
export interface PredictInput {
  defaultLanguage: string
  supportedLanguages: string[]
  sentence: string
  strIntent: string // this is temporary
  models: _.Dictionary<Model>
}

export interface PredictOutput {
  readonly rawText: string
  detectedLanguage: string
  languageCode: string
  utterance?: Utterance
  intent?: Intent<Utterance>
  strIntent: string // this is temporary
  pattern_entities: PatternEntity[] // use this from model ?
  list_entities: ListEntityModel[] // use this from model ?
  model: Model
  ctx_predictions?: MLToolkit.SVM.Prediction[]
  intent_predictions?: _.Dictionary<MLToolkit.SVM.Prediction[]> // intent predictions per ctx
  // TODO slots predictions per
}

// object simply to split the file a little
const predict = {
  DetectLanguage: async (input: PredictInput, tools: PreditcTools): Promise<PredictOutput> => {
    const langIdentifier = LanguageIdentifierProvider.getLanguageIdentifier(tools.mlToolkit)
    const lidRes = await langIdentifier.identify(input.sentence)
    const elected = lidRes.filter(pred => input.supportedLanguages.includes(pred.label))[0]

    // because with single-worded sentences, confidence is always very low
    // we assume that a input of 20 chars is more than a single word
    const threshold = input.sentence.length > 20 ? 0.5 : 0.3

    let detectedLanguage = _.get(elected, 'label', NA_LANG)
    if (detectedLanguage !== NA_LANG && !input.supportedLanguages.includes(detectedLanguage)) {
      detectedLanguage = NA_LANG
    }

    const languageCode =
      detectedLanguage !== NA_LANG && elected.value > threshold ? detectedLanguage : input.defaultLanguage

    const model = input.models[languageCode]

    return {
      ..._.pick(input, 'strIntent'),
      list_entities: model.artefacts.list_entities,
      pattern_entities: model.inputData.pattern_entities,
      rawText: input.sentence,
      detectedLanguage,
      languageCode,
      model
    }
  },
  PredictionUtterance: async (input: PredictOutput, tools: PreditcTools): Promise<PredictOutput> => {
    const [utterance] = await Utterances([input.rawText], input.languageCode, tools)

    const { tfidf, vocabVectors } = input.model.artefacts
    utterance.tokens.forEach(token => {
      const t = token.toString({ lowerCase: true })
      if (!tfidf[t]) {
        const closestToken = getClosestToken(t, <number[]>token.vectors, vocabVectors)
        tfidf[t] = tfidf[closestToken]
      }
    })

    utterance.setGlobalTfidf(tfidf)

    return {
      ...input,
      utterance
    }
  },
  ExtractEntities: async (input: PredictOutput, tools: PreditcTools): Promise<PredictOutput> => {
    await extractUtteranceEntities(input.utterance!, input, tools)
    return {
      ...input
    }
  },
  PredictContext: async (input: PredictOutput, tools: PreditcTools): Promise<PredictOutput> => {
    const predictor = new tools.mlToolkit.SVM.Predictor(input.model.artefacts.ctx_classifier)
    const features = computeSentenceEmbedding(input.utterance)
    const predictions = await predictor.predict(features) // filter our predictions under fixed treshold

    return {
      ...input,
      ctx_predictions: predictions
    }
  },
  PredictIntent: async (input: PredictOutput, tools: PreditcTools) => {
    const ctxToPredict = input.ctx_predictions.map(p => p.label)

    const predictions = await Promise.map(ctxToPredict, async ctx => {
      // todo use predictor from input when implemented
      const intentModel = input.model.artefacts.intent_classifier_per_ctx[ctx]
      if (!intentModel) {
        return
      }

      // TODO find exact matcher & try
      const predictor = new tools.mlToolkit.SVM.Predictor(intentModel)
      const features = computeSentenceEmbedding(input.utterance)
      return predictor.predict(features)
    })

    // todo filter out predictions with confidence threshold
    return {
      ...input,
      intent_predictions: _.zipObject(ctxToPredict, predictions),
      intent: input.model.outputData.intents.find(i => i.name == input.strIntent) // todo remove this
    }
  },
  ExtractSlots: async (input: PredictOutput) => {
    // TODO use loaded model
    // what's in artefact as this should only be serializable stuff
    const slots = await input.model.artefacts.slot_tagger.extract(input.utterance!, input.intent!)

    // TODO try to extract for each intent predictions and then rank this shit in the next pipeline step
    slots.forEach(({ slot, start, end }) => {
      input.utterance.tagSlot(slot, start, end)
    })

    return input
  },
  ElectIntent: async input => {
    return input
  }
}

export const Predict = async (input: PredictInput, tools: PreditcTools): Promise<PredictOutput> => {
  let output = await predict.DetectLanguage(input, tools)
  output = await predict.PredictionUtterance(output, tools)
  output = await predict.ExtractEntities(output, tools)
  output = await predict.PredictContext(output, tools)
  output = await predict.PredictIntent(output, tools)
  output = await predict.ExtractSlots(output)
  output = await predict.ElectIntent(output)
  return output
}
