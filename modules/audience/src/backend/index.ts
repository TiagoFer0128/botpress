import sdk from 'botpress/sdk'
import fs from 'fs'
import path from 'path'

import api from './api'

export type SDK = typeof sdk

const onInit = async (bp: SDK) => {}

const onReady = async (bp: SDK) => {
  await api(bp)
}

const serveFile = async (filePath: string): Promise<Buffer> => {
  filePath = filePath.toLowerCase()

  const mapping = {
    'index.js': path.join(__dirname, '../web/web.bundle.js')
  }

  // Web views
  if (mapping[filePath]) {
    return fs.readFileSync(mapping[filePath])
  }

  return new Buffer('')
}

const entryPoint: sdk.ModuleEntryPoint = {
  onInit,
  onReady,
  config: {},
  serveFile,
  definition: {
    name: 'audience',
    menuIcon: 'people',
    fullName: 'Audience',
    homepage: 'https://botpress.io'
  }
}

export default entryPoint
