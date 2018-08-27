import { RouterOptions } from 'botpress-module-sdk'
import { Serialize } from 'cerialize'
import { Router } from 'express'

import { BotRepository } from '../repositories/bot-repository'
import ActionService from '../services/action/action-service'
import { DefaultSearchParams } from '../services/cms'
import { CMSService } from '../services/cms/cms-service'
import { FlowView } from '../services/dialog'
import FlowService from '../services/dialog/flow-service'

import { BaseRouter } from './base-router'

export class BotRouter extends BaseRouter {
  private actionService: ActionService
  private botRepository: BotRepository
  private cmsService: CMSService
  private flowService: FlowService

  constructor(args: {
    actionService: ActionService
    botRepository: BotRepository
    cmsService: CMSService
    flowService: FlowService
  }) {
    super()

    this.actionService = args.actionService
    this.botRepository = args.botRepository
    this.cmsService = args.cmsService
    this.flowService = args.flowService
  }

  getNewRouter(path: string, options: RouterOptions) {
    const router = Router()
    // TODO Do something with options
    this.router.use(path, router)
    return router
  }

  setupRoutes() {
    this.router.get('/bots/:botId', async (request, response) => {
      const botId = request.params.botId
      const bot = await this.botRepository.getBotById(botId)

      response.send(bot)
    })

    this.router.get('/bots/:botId/middleware', async (req, res) => {
      const botId = req.params.botId
      // const middleware = await this.middlewareService.getMiddlewareForBot(botId)

      res.send([])
    })

    this.router.post('/bots/:botId/middleware', async (req, res) => {
      const botId = req.params.botId
      const { middleware } = req.body
      // await this.middlewareService.setMiddlewareForBot(botId, middleware)
      // res.send(await this.middlewareService.getMiddlewareForBot(botId))
    })

    this.router.get('/bots/:botId/content/types', async (req, res) => {
      const botId = req.params.botId
      const types = await this.cmsService.getAllContentTypes(botId)

      const response = await Promise.map(types, async type => {
        const count = await this.cmsService.countContentElementsForContentType(botId, type.id)
        return {
          id: type.id,
          count,
          title: type.title,
          schema: {
            json: type.jsonSchema,
            ui: type.uiSchema,
            title: type.title,
            renderer: type.id
          }
        }
      })

      res.send(response)
    })

    this.router.get('/bots/:botId/content/elements/count', async (req, res) => {
      const botId = req.params.botId
      const count = await this.cmsService.countContentElements(botId)
      res.send({ count })
    })

    this.router.get('/bots/:botId/content/:contentType?/elements', async (req, res) => {
      const { botId, contentType } = req.params
      const query = req.query || {}

      const types = await this.cmsService.listContentElements(botId, contentType, {
        ...DefaultSearchParams,
        count: Number(query.count) || DefaultSearchParams.count,
        from: Number(query.from) || DefaultSearchParams.from,
        searchTerm: query.searchTerm || DefaultSearchParams.searchTerm,
        ids: (query.ids && query.ids.split(',')) || DefaultSearchParams.ids
      })

      res.send(types)
    })

    this.router.get('/bots/:botId/content/:contentType?/elements/count', async (req, res) => {
      const { botId, contentType } = req.params
      const count = await this.cmsService.countContentElementsForContentType(botId, contentType)
      res.send({ count })
    })

    this.router.get('/bots/:botId/content/elements/:elementId', async (req, res) => {
      const { botId, elementId } = req.params
      const element = await this.cmsService.getContentElement(botId, elementId)
      res.send(element)
    })

    this.router.post('/bots/:botId/content/:contentType/elements/:elementId?', async (req, res) => {
      const { botId, contentType, elementId } = req.params
      const element = await this.cmsService.createOrUpdateContentElement(
        botId,
        contentType,
        req.body.formData,
        elementId
      )
      res.send(element)
    })

    this.router.get('/bots/:botId/flows', async (req, res) => {
      const botId = req.params.botId
      const flows = await this.flowService.loadAll(botId)
      res.send(flows)
    })

    this.router.post('/bots/:botId/flows', async (req, res) => {
      const botId = req.params.botId
      const flowViews = <FlowView[]>req.body

      await this.flowService.saveAll(botId, flowViews)
      res.sendStatus(201)
    })

    this.router.get('/bots/:botId/actions', async (req, res) => {
      const botId = req.params.botId
      const actions = await this.actionService.forBot(botId).listActions({ includeMetadata: true })
      res.send(Serialize(actions))
    })
  }
}
