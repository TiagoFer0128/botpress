import retry from 'bluebird-retry'
import * as sdk from 'botpress/sdk'
import crypto from 'crypto'
import fs from 'fs'
import { flatMap } from 'lodash'

import { Config } from '../config'

import CRFExtractor from './pipelines/entities/crf_extractor'
import { DucklingEntityExtractor } from './pipelines/entities/duckling_extractor'
import FastTextClassifier from './pipelines/intents/ft_classifier'
import { createIntentMatcher } from './pipelines/intents/matcher'
import { FastTextLanguageId } from './pipelines/language/ft_lid'
import Storage from './storage'
import { EntityExtractor, LanguageIdentifier, Prediction, SlotExtractor } from './typings'

export default class ScopedEngine {
  public readonly storage: Storage
  public confidenceTreshold: number

  private readonly intentClassifier: FastTextClassifier
  private readonly langDetector: LanguageIdentifier
  private readonly knownEntityExtractor: EntityExtractor
  private readonly slotExtractor: SlotExtractor

  private retryPolicy = {
    interval: 100,
    max_interval: 500,
    timeout: 5000,
    max_tries: 3
  }

  constructor(private logger: sdk.Logger, private botId: string, private readonly config: Config) {
    this.storage = new Storage(config, this.botId)
    this.intentClassifier = new FastTextClassifier(this.logger)
    this.langDetector = new FastTextLanguageId(this.logger)
    this.knownEntityExtractor = new DucklingEntityExtractor(this.logger)
    this.slotExtractor = new CRFExtractor()
  }

  async init(): Promise<void> {
    this.confidenceTreshold = this.config.confidenceTreshold

    if (isNaN(this.confidenceTreshold) || this.confidenceTreshold < 0 || this.confidenceTreshold > 1) {
      this.confidenceTreshold = 0.7
    }

    if (await this.checkSyncNeeded()) {
      await this.sync()
    }
  }

  public async sync(): Promise<void> {
    const intents = await this.storage.getIntents()
    const modelHash = this._getIntentsHash(intents)

    // this is only good for intents model at the moment. soon we'll store crf, skipgram an kmeans model necessary for crf extractor
    if (await this.storage.modelExists(modelHash)) {
      await this._loadModel(modelHash)
    } else {
      await this._trainModel(intents, modelHash)
    }

    // TODO try to load model if saved(we don't save at the moment)
    await this.slotExtractor.train(flatMap(intents, intent => intent.utterances))
  }

  private async _loadModel(modelHash: string) {
    this.logger.debug(`Restoring intents model '${modelHash}' from storage`)
    const modelBuffer = await this.storage.getModelAsBuffer(modelHash)
    this.intentClassifier.loadModel(modelBuffer, modelHash)
  }

  private async _trainModel(intents: any[], modelHash: string) {
    try {
      this.logger.debug('The intents model needs to be updated, training model ...')
      const intentModelPath = await this.intentClassifier.train(intents, modelHash)
      const intentModelBuffer = fs.readFileSync(intentModelPath)
      const intentModelName = `${Date.now()}__${modelHash}.bin`
      await this.storage.persistModel(intentModelBuffer, intentModelName)
      this.logger.debug('Intents done training')
    } catch (err) {
      return this.logger.attachError(err).error('Error training intents')
    }
  }

  public async checkSyncNeeded(): Promise<boolean> {
    const intents = await this.storage.getIntents()

    if (intents.length) {
      const intentsHash = this._getIntentsHash(intents)
      return this.intentClassifier.currentModelId !== intentsHash
    }

    return false
  }

  private _getIntentsHash(intents) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(intents))
      .digest('hex')
  }

  public async extract(incomingEvent: sdk.IO.Event): Promise<sdk.IO.EventUnderstanding> {
    return retry(() => this._extract(incomingEvent), this.retryPolicy)
  }

  private async _extract(incomingEvent: sdk.IO.Event): Promise<sdk.IO.EventUnderstanding> {
    const text = incomingEvent.preview

    const lang = await this.langDetector.identify(text)
    const entities = await this.knownEntityExtractor.extract(text, lang)
    const intents: Prediction[] = await this.intentClassifier.predict(text)
    const slots = await this.slotExtractor.extract(text)

    const intent = intents.find(c => {
      return c.confidence >= this.confidenceTreshold
    }) || { confidence: 1.0, name: 'none' }

    return {
      language: lang,
      slots,
      entities,
      intent: { ...intent, matches: createIntentMatcher(intent.name) },
      intents: intents.map(p => ({ ...p, matches: createIntentMatcher(p.name) }))
    }
  }
}
