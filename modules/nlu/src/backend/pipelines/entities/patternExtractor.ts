import * as sdk from 'botpress/sdk'
import { flatMap } from 'lodash'

interface ExtractedPattern {
  value: string
  sourceIndex: number
}

// Padding is necessary due to the recursive nature of this function.
// Every found pattern is removed from the candidate, therefor the length of the extracted value (padding) is needed to compute sourceIndex of future extractions
const _extractPatterns = (candidate: string, pattern: RegExp, extracted: ExtractedPattern[] = [], padding = 0): ExtractedPattern[] => {
  const res = pattern.exec(candidate)
  if (!res) return extracted

  const value = res[0]
  const nextPadding = padding + value.length
  const nextCandidate = candidate.slice(0, res.index) + candidate.slice(res.index + value.length)
  extracted.push({
    value,
    sourceIndex: res.index + padding
  })

  return _extractPatterns(nextCandidate, pattern, extracted, nextPadding)
}

export const extractPatternEntities = (input: string, entityDefs: sdk.NLU.EntityDefinition[]): sdk.NLU.Entity[] => {
  return flatMap(entityDefs, entityDef => {
    // TODO build regex given the entity def (either use the provided pattern or generate one/many given all synonyms of all occurences)

    const regex = new RegExp(entityDef.pattern!)
    return _extractPatterns(input, regex).map(res => ({
      name: entityDef.name,
      type: entityDef.type, // pattern
      meta: {
        confidence: 1, // pattern always has 1 confidence
        provider: 'native',
        source: res.value,
        start: res.sourceIndex,
        end: res.sourceIndex + res.value.length - 1,
        raw: {}
      },
      data: {
        extras: {},
        value: res.value,
        unit: 'string',
      }
    }))
  })
}

const _extractEntitiesFromOccurence = (candidate: string, occurence: sdk.NLU.EntityDefOccurence): sdk.NLU.Entity[] => {
  const pattern = RegExp([occurence.name, ...occurence.synonyms].join('|'), 'i')
  return _extractPatterns(candidate, pattern)
    .map(extracted => ({
      name: occurence.name,
      type: 'list',
      meta: {
        confidence: 1, // extrated with synonyme as patterns
        provider: 'native',
        source: extracted.value,
        start: extracted.sourceIndex,
        end: extracted.sourceIndex + extracted.value.length - 1,
        raw: {}
      },
      data: {
        extras: {},
        value: occurence.name, // cannonical value,
        unit: 'string'
      }
    }))
}

export const extractListEntities = (input: string, entityDefs: sdk.NLU.EntityDefinition[]): sdk.NLU.Entity[] => {
  return flatMap(entityDefs, entityDef => {
    return flatMap((entityDef.occurences || []), occurence => {
      return _extractEntitiesFromOccurence(input, occurence)
    })
  })
}
