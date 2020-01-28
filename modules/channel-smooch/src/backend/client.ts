import * as sdk from 'botpress/sdk'
import Smooch from 'smooch-core'

import { Config } from '../config'

import { Clients } from './typings'

const MIDDLEWARE_NAME = 'smooch.sendMessage'

export class SmoochClient {
  private smooch: any
  private webhookUrl: string
  private logger: sdk.Logger

  constructor(
    private bp: typeof sdk,
    private botId: string,
    private config: Config,
    private router: any,
    private route: string
  ) {
    this.logger = bp.logger.forBot(botId)
  }

  async initialize() {
    if (!this.config.keyId || !this.config.secret) {
      return this.logger.error(`[${this.botId}] The keyId and secret must be configured to use this channel.`)
    }

    this.smooch = new Smooch({
      keyId: this.config.keyId,
      secret: this.config.secret,
      scope: 'app'
    })

    const url = (await this.router.getPublicPath()) + this.route
    this.webhookUrl = url.replace('BOT_ID', this.botId)

    try {
      const { webhook } = await this.smooch.webhooks.create({
        target: this.webhookUrl,
        triggers: ['message:appUser']
      })
      this.logger.info(`[${this.botId}] Successfully created smooch webhook with url : ${webhook.target}`)
    } catch (e) {
      this.logger.error(`[${this.botId}] Failed to create smooch webhook. Provided keyId and secret are likely invalid`)
      throw e
    }
  }

  async removeWebhook() {
    const { webhooks } = await this.smooch.webhooks.list()
    for (const hook of webhooks) {
      if (hook.target === this.webhookUrl) {
        await this.smooch.webhooks.delete(hook._id)
      }
    }
  }

  async handleWebhookRequest(body: any) {
    if (!body.messages) {
      return
    }

    for (const message of body.messages) {
      if (message.type !== 'text') {
        continue
      }

      await this.bp.events.sendEvent(
        this.bp.IO.Event({
          botId: this.botId,
          channel: 'smooch',
          direction: 'incoming',
          type: 'text',
          payload: {
            type: 'text',
            text: message.text
          },
          preview: message.text,
          target: body.appUser._id
        })
      )
    }
  }

  async handleOutgoingEvent(event: sdk.IO.Event, next: sdk.IO.MiddlewareNextCallback) {
    if (event.type === 'typing') {
      await this.smooch.appUsers.conversationActivity({
        appId: this.smooch.keyId,
        userId: event.target,
        activityProps: {
          role: 'appMaker',
          type: 'typing:start'
        }
      })
    } else if (event.type === 'text') {
      await this.smooch.appUsers.sendMessage({
        appId: this.smooch.keyId,
        userId: event.target,
        message: {
          text: event.payload.text,
          role: 'appMaker',
          type: 'text'
        }
      })
    }

    next(undefined, false)
  }
}

export async function setupMiddleware(bp: typeof sdk, clients: Clients) {
  bp.events.registerMiddleware({
    description:
      'Sends out messages that targets platform = Smooch.' +
      ' This middleware should be placed at the end as it swallows events once sent.',
    direction: 'outgoing',
    handler: outgoingHandler,
    name: MIDDLEWARE_NAME,
    order: 100
  })

  async function outgoingHandler(event: sdk.IO.Event, next: sdk.IO.MiddlewareNextCallback) {
    if (event.channel !== 'smooch') {
      return next()
    }

    const client: SmoochClient = clients[event.botId]
    if (!client) {
      return next()
    }

    return client.handleOutgoingEvent(event, next)
  }
}

export async function removeMiddleware(bp: typeof sdk) {
  bp.events.removeMiddleware(MIDDLEWARE_NAME)
}
