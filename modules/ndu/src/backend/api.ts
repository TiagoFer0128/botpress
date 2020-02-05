import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import { conditionsDefinitions } from './conditions'
import { BotStorage } from './typings'

export default async (bp: typeof sdk, bots: BotStorage) => {
  const router = bp.http.createRouterForBot('ndu')

  router.get('/conditions', async (req, res) => {
    res.send(conditionsDefinitions)
  })

  router.get('/topics', async (req, res) => {
    const storage = bots[req.params.botId]
    res.send(await storage.getTopics())
  })

  router.get('/events', async (req, res) => {
    res.send(
      await bp
        .database('events')
        .select('*')
        .where({ botId: req.params.botId, direction: 'incoming' })
        .orderBy('createdOn', 'desc')
        .limit(100)
    )
  })

  router.post('/topics', async (req, res) => {
    const storage = bots[req.params.botId]
    await storage.saveTopics(req.body)
    res.send(true)
  })

  router.get('/library', async (req, res) => {
    res.send([])
  })
}
