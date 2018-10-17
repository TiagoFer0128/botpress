import { createWriteStream, writeFileSync } from 'fs'
import { EOL } from 'os'
import tmp from 'tmp'

import FTWrapper from './fasttext.wrapper'

const FAST_TEXT_LABEL_KEY = '__label__'

interface Intent {
  name: string
  utterances: Array<String>
}

interface Prediction {
  name: string
  confidence: number
}

// TODO implement fastTrain
// TODO better error handling please
// TODO implement testModel ?

class FastTextClassifier {
  private modelPath = ''

  public currentModelId: string | undefined

  private parsePredictions(predictionStr: string) {
    const predictions = predictionStr.split(FAST_TEXT_LABEL_KEY)

    const parsed = predictions.filter(p => p != '' && p != '\n').map(p => {
      p = p.replace(FAST_TEXT_LABEL_KEY, '')
      const psplit = p.split(' ')

      return {
        name: psplit[0],
        confidence: parseFloat(psplit[1])
      }
    })

    return parsed.length ? parsed : [{ name: 'none', confidence: 0.9999 }]
  }

  private writeTrainingSet(intents: Array<Intent>, trainingFilePath) {
    const fileStream = createWriteStream(trainingFilePath, { flags: 'a' })

    for (const intent of intents) {
      intent.utterances.forEach(text => {
        fileStream.write(`${FAST_TEXT_LABEL_KEY}${intent.name} ${text}${EOL}`)
      })
    }

    return Promise.fromCallback(cb => fileStream.end(cb))
  }

  async train(intents: Array<Intent>, modelId: string) {
    const dataFn = tmp.tmpNameSync()
    await this.writeTrainingSet(intents, dataFn)

    const modelFn = tmp.tmpNameSync()
    FTWrapper.supervised(dataFn, modelFn)
    this.modelPath = `${modelFn}.bin`
    this.currentModelId = modelId

    return this.modelPath
  }

  loadModel(model: Buffer, modelId?: string) {
    this.currentModelId = modelId

    const tmpFn = tmp.tmpNameSync()
    writeFileSync(tmpFn, model)
    this.modelPath = tmpFn
  }

  predict(input: string, numClass = 1): Array<Prediction> {
    if (!this.modelPath) {
      throw new Error('model is not set')
    }

    const tmpF = tmp.fileSync()
    writeFileSync(tmpF.name, input)

    const preds = FTWrapper.predictProb(this.modelPath, tmpF.name, numClass)
    tmpF.removeCallback()

    return this.parsePredictions(preds)
  }
}

export default FastTextClassifier
