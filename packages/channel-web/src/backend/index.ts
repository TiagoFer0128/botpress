import 'bluebird-global'
import { BotpressAPI, BotpressEvent, MiddlewareDefinition } from 'botpress-module-sdk'
import fs from 'fs'
import path from 'path'

import api from './api'
import WebchatDatabase from './db'
import OutgoingHandler from './outgoing'
import socket from './socket'
import umm from './umm'

export type Extension = {
  'channel-web': {}
}

export const onInit = async (bp: BotpressAPI & Extension) => {
  bp['channel-web'] = {}

  const db = new WebchatDatabase(bp)
  await db.initialize()

  await api(bp, db)
  await socket(bp, db)
  await umm(bp)
}

export const onReady = async bp => {}

export const config = {
  uploadsUseS3: { type: 'bool', required: false, default: false, env: 'CHANNEL_WEB_USE_S3' },
  uploadsS3Bucket: { type: 'string', required: false, default: 'bucket-name', env: 'CHANNEL_WEB_S3_BUCKET' },
  uploadsS3AWSAccessKey: { type: 'any', required: false, default: undefined, env: 'CHANNEL_WEB_S3_ACCESS_KEY' },
  uploadsS3Region: { type: 'any', required: false, default: undefined, env: 'CHANNEL_WEB_S3_REGION' },
  uploadsS3AWSAccessSecret: { type: 'any', required: false, default: undefined, env: 'CHANNEL_WEB_S3_KEY_SECRET' },
  startNewConvoOnTimeout: {
    type: 'bool',
    required: false,
    default: false,
    env: 'CHANNEL_WEB_START_NEW_CONVO_ON_TIMEOUT'
  },
  recentConversationLifetime: {
    type: 'any',
    required: false,
    default: '6 hours',
    env: 'CHANNEL_WEB_RECENT_CONVERSATION_LIFETIME'
  }
}

export const defaultConfigJson = `
{
  /************
    Optional settings
  *************/

  "uploadsUseS3": false,
  "uploadsS3Bucket": "bucket-name",
  "uploadsS3Region": "eu-west-1",
  "uploadsS3AWSAccessKey": "your-aws-key-name",
  "uploadsS3AWSAccessSecret": "secret-key",
  "startNewConvoOnTimeout": false,
  "recentConversationLifetime": "6 hours"
}
`

export const serveFile = async (filePath: string): Promise<Buffer> => {
  filePath = filePath.toLowerCase()

  const mapping = {
    'index.js': path.join(__dirname, '../web/web.bundle.js'),
    'embedded.js': path.join(__dirname, '../web/embedded.bundle.js'),
    'fullscreen.js': path.join(__dirname, '../web/fullscreen.bundle.js')
  }

  // Web views
  if (mapping[filePath]) {
    return fs.readFileSync(mapping[filePath])
  }

  return new Buffer('')
}
