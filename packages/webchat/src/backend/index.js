import umm from './umm'
import api from './api'
import socket from './socket'
import db from './db'

exports.onInit = async bp => {
  console.log('Init!!!')
  return
  const config = await configurator.loadAll()

  bp.webchat = {}

  // Setup the socket events
  await socket(bp, config)

  // Initialize UMM
  return umm(bp)
}

exports.onReady = async bp => {
  console.log('On ready', bp.config)
  console.log('Config', await bp.config.getModuleConfig('webchat'))
  return
  const config = await configurator.loadAll()

  // Initialize the database
  const knex = await bp.db.get()
  db(knex, config).initialize()

  // Setup the APIs
  await api(bp, config)
}

exports.config = {
  uploadsUseS3: { type: 'bool', required: false, default: false, env: 'WEBCHAT_USE_S3' },
  uploadsS3Bucket: { type: 'string', required: false, default: 'bucket-name', env: 'WEBCHAT_S3_BUCKET' },
  uploadsS3AWSAccessKey: { type: 'any', required: false, default: null, env: 'WEBCHAT_S3_ACCESS_KEY' },
  uploadsS3Region: { type: 'any', required: false, default: null, env: 'WEBCHAT_S3_REGION' },
  uploadsS3AWSAccessSecret: { type: 'any', required: false, default: null, env: 'WEBCHAT_S3_KEY_SECRET' },
  startNewConvoOnTimeout: {
    type: 'bool',
    required: false,
    default: false,
    env: 'WEBCHAT_START_NEW_CONVO_ON_TIMEOUT'
  },
  recentConversationLifetime: {
    type: 'any',
    required: false,
    default: '6 hours',
    env: 'WEBCHAT_RECENT_CONVERSATION_LIFETIME'
  }
}

exports.defaultConfigJson = `
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
