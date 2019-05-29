import * as sdk from 'botpress/sdk'

const { Tagger, Trainer } = require('./crfsuite')
import { FastTextModel } from './fasttext'
import computeJaroWinklerDistance from './homebrew/jaro-winkler'
import computeLevenshteinDistance from './homebrew/levenshtein'
import { decode, encode } from './sentencepiece'

const MLToolkit: typeof sdk.MLToolkit = {
  CRF: {
    createTagger: Tagger,
    createTrainer: Trainer
  },
  FastText: { Model: FastTextModel },
  Strings: { computeLevenshteinDistance, computeJaroWinklerDistance },
  SentencePiece: { encode, decode }
}

export default MLToolkit
