import { BotConfig, BotPipelineStatus, Logger } from 'botpress/sdk'
import { ConfigProvider } from 'core/config/config-loader'
import { BotService } from 'core/services/bot-service'
import { WorkspaceService } from 'core/services/workspace-service'
import { RequestHandler, Router } from 'express'
import _ from 'lodash'

import { CustomRouter } from '../customRouter'
import { ConflictError } from '../errors'
import { needPermissions, success as sendSuccess } from '../util'

export class BotsRouter extends CustomRouter {
  public readonly router: Router

  private readonly resource = 'admin.bots'
  private needPermissions: (operation: string, resource: string) => RequestHandler
  private logger!: Logger

  constructor(
    logger: Logger,
    private workspaceService: WorkspaceService,
    private botService: BotService,
    private configProvider: ConfigProvider
  ) {
    super('Bots', logger, Router({ mergeParams: true }))
    this.logger = logger
    this.needPermissions = needPermissions(this.workspaceService)
    this.router = Router({ mergeParams: true })
    this.setupRoutes()
  }

  setupRoutes() {
    const router = this.router

    router.get(
      '/',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        this.workspaceService.assertUserExists(req.tokenUser!.email)

        const botsRefs = await this.workspaceService.getBotRefs()
        const bots = await this.botService.findBotsByIds(botsRefs)
        const workpace = await this.workspaceService.getWorkspace()

        return sendSuccess(res, 'Retrieved bots for all teams', {
          bots: bots && bots.filter(Boolean),
          workspace: {
            name: workpace.name,
            pipeline: workpace.pipeline
          }
        })
      })
    )

    router.get(
      '/categories',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const categories = (await this.configProvider.getBotpressConfig()).botCategories
        return sendSuccess(res, 'Retreived bot categories', { categories })
      })
    )

    router.post(
      '/',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const bot = <BotConfig>_.pick(req.body, ['id', 'name', 'category'])

        this.workspaceService.assertUserExists(req.tokenUser!.email)

        const botExists = (await this.botService.getBotsIds()).includes(bot.id)
        const botLinked = (await this.workspaceService.getBotRefs()).includes(bot.id)

        if (botExists && botLinked) {
          throw new ConflictError(`Bot "${bot.id}" already exists and is already linked in workspace`)
        }

        if (botExists) {
          this.logger.warn(`Bot "${bot.id}" already exists. Linking to workspace`)
        } else {
          bot.pipeline_status = {
            current_stage: {
              id: (await this.workspaceService.getPipeline())[0].id,
              promoted_at: new Date(),
              promoted_by: req.tokenUser!.email
            }
          }
          await this.botService.addBot(bot, req.body.template)
        }

        if (botLinked) {
          this.logger.warn(`Bot "${bot.id}" already linked in workspace. See workpaces.json for more details`)
        } else {
          await this.workspaceService.addBotRef(bot.id)
        }

        return sendSuccess(res, 'Added new bot', {
          botId: bot.id
        })
      })
    )

    router.post(
      '/:botId/promote',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        try {
          await this.botService.requestBotPromotion(req.params.botId, req.tokenUser!.email)

          return res.sendStatus(200)
        } catch (err) {
          this.logger.attachError(err).error('cannot promote bot')
          res.status(400)
        }
      })
    )

    router.put(
      '/:botId',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const { botId } = req.params
        const bot = <BotConfig>req.body
        this.workspaceService.assertUserExists(req.tokenUser!.email)

        await this.botService.updateBot(botId, bot)

        return sendSuccess(res, 'Updated bot', {
          botId
        })
      })
    )

    router.delete(
      '/:botId',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const { botId } = req.params
        this.workspaceService.assertUserExists(req.tokenUser!.email)

        await this.botService.deleteBot(botId)
        await this.workspaceService.deleteBotRef(botId)

        return sendSuccess(res, 'Removed bot from team', { botId })
      })
    )

    router.get(
      '/:botId/export',
      this.asyncMiddleware(async (req, res) => {
        const botId = req.params.botId
        const tarball = await this.botService.exportBot(botId)

        res.writeHead(200, {
          'Content-Type': 'application/tar+gzip',
          'Content-Disposition': `attachment; filename=bot_${botId}_${Date.now()}.tgz`,
          'Content-Length': tarball.length
        })
        res.end(tarball)
      })
    )
  }
}
