import * as sdk from 'botpress/sdk'

import Database from './db'

import { QueryFilters } from './typings'

const N_MESSAGE_GROUPS_READ = 10

export default async (bp: typeof sdk, db: Database) => {
  const router = bp.http.createRouterForBot('history')

  router.get('/conversations', async (req, res) => {
    const { botId } = req.params
    const { from, to } = req.query

    const conversationsInfo = await db.getDistinctConversations(botId, from, to)

    res.send(conversationsInfo)
  })

  router.get('/messages/:convId', async (req, res) => {
    const convId = req.params.convId
    const { flag } = req.query

    const filters: QueryFilters = { flag: flag === 'true' }
    const messageGroups = await db.getMessagesOfConversation(convId, N_MESSAGE_GROUPS_READ, 0, filters)
    const messageCount = await db.getConversationMessageCount(convId)
    const messageGroupCount = await db.getConversationMessageGroupCount(convId, filters)

    res.send({ messageGroups, messageCount, messageGroupCount })
  })

  router.get('/more-messages/:convId', async (req, res) => {
    const convId = req.params.convId
    const { offset, clientCount, flag } = req.query

    const filters: QueryFilters = { flag: flag === 'true' }
    const actualCount = await db.getConversationMessageGroupCount(convId, filters)
    const unsyncOffset = Number(offset) + Math.max(actualCount - clientCount, 0)

    const messageGroups = await db.getMessagesOfConversation(convId, N_MESSAGE_GROUPS_READ, unsyncOffset, filters)
    res.send(messageGroups)
  })

  router.post('/flagged-messages', async (req, res) => {
    const messageGroups = req.body
    await db.flagMessages(messageGroups)
    res.sendStatus(201)
  })

  router.delete('/flagged-messages', async (req, res) => {
    const messageGroups = req.body
    await db.unflagMessages(messageGroups)
    res.sendStatus(201)
  })
}
