import _ from 'lodash'
import * as sdk from 'botpress/sdk'
import HitlDb from './db'
import mware from './mware'
import api from './api'

// TODO: Cleanup old sessions
// TODO: If messages count > X, delete some

let db = null

export type Extension = {
  hitl: {
    pause: Function
    unpause: Function
    isPaused: Function
  }
}

export const config = {
  sessionExpiry: { type: 'string', default: '3 days' },
  paused: { type: 'bool', default: false, env: 'BOTPRESS_HITL_PAUSED' }
}

export const onInit = async (bp: typeof sdk & Extension) => {
  db = new HitlDb(bp)
  await db.initialize()
  await mware(bp, db, config)
}

export const onReady = async (bp: typeof sdk & Extension) => {
  await api(bp, db)
}
