/*---------------------------------------------------------------------------------------------
*  Copyright (c) Botpress, Inc. All rights reserved.
*  Licensed under the AGPL-3.0 license. See license.txt at project root for more information.
*--------------------------------------------------------------------------------------------*/

import { ContentElement } from 'botpress/sdk'
import { Serialize } from 'cerialize'
import { gaId, machineUUID } from 'common/stats'
import { BotpressConfig } from 'core/config/botpress.config'
import { ConfigProvider } from 'core/config/config-loader'
import { GhostService } from 'core/services'
import { AdminService } from 'core/services/admin/service'
import AuthService, { TOKEN_AUDIENCE } from 'core/services/auth/auth-service'
import { RequestHandler, Router } from 'express'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import multer from 'multer'
import path from 'path'
import { RouterOptions } from 'request'

import { BotRepository } from '../repositories'
import ActionService from '../services/action/action-service'
import { DefaultSearchParams } from '../services/cms'
import { CMSService } from '../services/cms/cms-service'
import { FlowView } from '../services/dialog'
import { FlowService } from '../services/dialog/flow/service'
import { LogsService } from '../services/logs/service'
import MediaService from '../services/media'
import { NotificationsService } from '../services/notification/service'

import { CustomRouter } from '.'
import { checkTokenHeader, needPermissions } from './util'

export class BotsRouter implements CustomRouter {
  public readonly router: Router

  private actionService: ActionService
  private botRepository: BotRepository
  private configProvider: ConfigProvider
  private cmsService: CMSService
  private flowService: FlowService
  private mediaService: MediaService
  private logsService: LogsService
  private notificationService: NotificationsService
  private authService: AuthService
  private adminService: AdminService
  private ghostService: GhostService
  private checkTokenHeader: RequestHandler
  private needPermissions: (operation: string, resource: string) => RequestHandler
  private machineId: string | undefined
  private botpressConfig: BotpressConfig | undefined

  constructor(args: {
    actionService: ActionService
    botRepository: BotRepository
    configProvider: ConfigProvider
    cmsService: CMSService
    flowService: FlowService
    mediaService: MediaService
    logsService: LogsService
    notificationService: NotificationsService
    authService: AuthService
    adminService: AdminService
    ghostService: GhostService
  }) {
    this.actionService = args.actionService
    this.botRepository = args.botRepository
    this.configProvider = args.configProvider
    this.cmsService = args.cmsService
    this.flowService = args.flowService
    this.mediaService = args.mediaService
    this.logsService = args.logsService
    this.notificationService = args.notificationService
    this.authService = args.authService
    this.adminService = args.adminService
    this.ghostService = args.ghostService

    this.needPermissions = needPermissions(this.adminService)
    this.checkTokenHeader = checkTokenHeader(this.authService, TOKEN_AUDIENCE)

    this.router = Router({ mergeParams: true })
  }

  async initialize() {
    this.botpressConfig = await this.configProvider.getBotpressConfig()
    this.machineId = await machineUUID()
    this.setupRoutes()
  }

  getNewRouter(path: string, options: RouterOptions) {
    const router = Router({ mergeParams: true })
    this.router.use('/mod/' + path, router)
    return router
  }

  augmentElement = async (element: ContentElement) => {
    const contentType = await this.cmsService.getContentType(element.contentType)
    return {
      ...element,
      schema: {
        json: contentType.jsonSchema,
        ui: contentType.uiSchema,
        title: contentType.title,
        renderer: contentType.id
      }
    }
  }

  private studioParams(botId) {
    return {
      botId,
      authentication: {
        tokenDuration: ms('6h')
      },
      allowStats: this.botpressConfig!.allowStats,
      uuid: this.machineId,
      gaId: gaId,
      showGuidedTour: false, // TODO
      ghostEnabled: this.ghostService.isGhostEnabled,
      flowEditorDisabled: !process.IS_LICENSED,
      botpress: {
        name: 'Botpress Server',
        version: process.BOTPRESS_VERSION
      },
      isLicensed: process.IS_LICENSED,
      edition: process.BOTPRESS_EDITION
    }
  }

  private setupRoutes() {
    // Unauthenticated, don't return sensitive info here
    this.router.get('/studio-params', async (req, res) => {
      const info = this.studioParams(req.params.botId)
      res.send(info)
    })

    this.router.get('/:app(studio|lite)/js/env.js', async (req, res) => {
      const { botId, app } = req.params
      const data = this.studioParams(botId)
      const liteEnv = `
              // Lite Views Specific
          `
      const studioEnv = `
              // Botpress Studio Specific
              window.AUTH_TOKEN_DURATION = ${data.authentication.tokenDuration};
              window.ALLOW_STATS = ${data.allowStats};
              window.SHOW_GUIDED_TOUR = ${data.showGuidedTour};
              window.GHOST_ENABLED = ${data.ghostEnabled};
              window.BOTPRESS_FLOW_EDITOR_DISABLED = ${data.flowEditorDisabled};
              window.BOTPRESS_CLOUD_SETTINGS = {"botId":"","endpoint":"","teamId":"","env":"dev"};
              window.IS_LICENSED = ${data.isLicensed};
              window.EDITION = '${data.edition}';
          `

      const totalEnv = `
          (function(window) {
              // Common
              window.UUID = "${data.uuid}"
              window.ANALYTICS_ID = "${data.gaId}";
              window.API_PATH = "/api/v1";
              window.BOT_API_PATH = "/api/v1/bots/${botId}";
              window.BOT_ID = "${botId}";
              window.BP_BASE_PATH = "/${app}/${botId}";
              window.BOTPRESS_VERSION = "${data.botpress.version}";
              window.APP_NAME = "${data.botpress.name}";
              window.NODE_ENV = "production";
              window.BOTPRESS_ENV = "dev";
              window.BOTPRESS_CLOUD_ENABLED = false;
              window.DEV_MODE = true;
              ${app === 'studio' ? studioEnv : ''}
              ${app === 'lite' ? liteEnv : ''}
              // End
            })(typeof window != 'undefined' ? window : {})
          `

      res.contentType('text/javascript')
      res.send(totalEnv)
    })

    this.router.get('/', this.checkTokenHeader, this.needPermissions('read', 'bot.information'), async (req, res) => {
      const botId = req.params.botId
      const bot = await this.botRepository.getBotById(botId)

      res.send(bot)
    })

    this.router.get(
      '/content/types',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.content'),
      async (req, res) => {
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
      }
    )

    this.router.get(
      '/content/elements/count',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.content'),
      async (req, res) => {
        const botId = req.params.botId
        const count = await this.cmsService.countContentElements(botId)
        res.send({ count })
      }
    )

    this.router.get(
      '/content/:contentType?/elements',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.content'),
      async (req, res) => {
        const { botId, contentType } = req.params
        const query = req.query || {}

        const elements = await this.cmsService.listContentElements(botId, contentType, {
          ...DefaultSearchParams,
          count: Number(query.count) || DefaultSearchParams.count,
          from: Number(query.from) || DefaultSearchParams.from,
          searchTerm: query.searchTerm || DefaultSearchParams.searchTerm,
          ids: (query.ids && query.ids.split(',')) || DefaultSearchParams.ids
        })

        const augmentedElements = await Promise.map(elements, this.augmentElement)
        res.send(augmentedElements)
      }
    )

    this.router.get(
      '/content/:contentType?/elements/count',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.content'),
      async (req, res) => {
        const { botId, contentType } = req.params
        const count = await this.cmsService.countContentElementsForContentType(botId, contentType)
        res.send({ count })
      }
    )

    this.router.get(
      '/content/elements/:elementId',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.content'),
      async (req, res) => {
        const { botId, elementId } = req.params
        const element = await this.cmsService.getContentElement(botId, elementId)
        res.send(await this.augmentElement(element))
      }
    )

    this.router.post(
      '/content/:contentType/elements/:elementId?',
      this.checkTokenHeader,
      this.needPermissions('write', 'bot.content'),
      async (req, res) => {
        const { botId, contentType, elementId } = req.params
        const element = await this.cmsService.createOrUpdateContentElement(
          botId,
          contentType,
          req.body.formData,
          elementId
        )
        res.send(element)
      }
    )

    this.router.post(
      '/content/elements/bulk_delete',
      this.checkTokenHeader,
      this.needPermissions('write', 'bot.content'),
      async (req, res) => {
        await this.cmsService.deleteContentElements(req.params.botId, req.body)
        res.sendStatus(200)
      }
    )

    this.router.get('/flows', this.checkTokenHeader, this.needPermissions('read', 'bot.flows'), async (req, res) => {
      const botId = req.params.botId
      const flows = await this.flowService.loadAll(botId)
      res.send(flows)
    })

    this.router.post('/flows', this.checkTokenHeader, this.needPermissions('write', 'bot.flows'), async (req, res) => {
      const botId = req.params.botId
      const flowViews = <FlowView[]>req.body

      await this.flowService.saveAll(botId, flowViews)
      res.sendStatus(201)
    })

    this.router.get('/actions', this.checkTokenHeader, this.needPermissions('read', 'bot.flows'), async (req, res) => {
      const botId = req.params.botId
      const actions = await this.actionService.forBot(botId).listActions({ includeMetadata: true })
      res.send(Serialize(actions))
    })

    const mediaUploadMulter = multer({
      limits: {
        fileSize: 1024 * 1000 * 10 // 10mb
      }
    })

    // This is not a bug: do not authenticate this route
    this.router.get('/media/:filename', async (req, res) => {
      const botId = req.params.botId
      const type = path.extname(req.params.filename)

      const contents = await this.mediaService.readFile(botId, req.params.filename).catch(() => undefined)
      if (!contents) {
        return res.sendStatus(404)
      }

      // files are never overwritten because of the unique ID
      // so we can set the header to cache the asset for 1 year
      return res
        .set({ 'Cache-Control': 'max-age=31556926' })
        .type(type)
        .send(contents)
    })

    this.router.post(
      '/media',
      this.checkTokenHeader,
      this.needPermissions('write', 'bot.media'),
      mediaUploadMulter.single('file'),
      async (req, res) => {
        const botId = req.params.botId
        const fileName = await this.mediaService.saveFile(botId, req['file'].originalname, req['file'].buffer)
        const url = `/api/v1/bots/${botId}/media/${fileName}`
        res.json({ url })
      }
    )

    this.router.get('/logs', this.checkTokenHeader, this.needPermissions('read', 'bot.logs'), async (req, res) => {
      const limit = req.query.limit
      const botId = req.params.botId
      const logs = await this.logsService.getLogsForBot(botId, limit)
      res.send(logs)
    })

    this.router.get(
      '/logs/archive',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.logs'),
      async (req, res) => {
        const botId = req.params.botId
        const logs = await this.logsService.getLogsForBot(botId)
        res.setHeader('Content-type', 'text/plain')
        res.setHeader('Content-disposition', 'attachment; filename=logs.txt')
        res.send(
          logs
            .map(({ timestamp, level, message }) => {
              const time = moment(new Date(timestamp)).format('MMM DD HH:mm:ss')
              return `${time} ${level}: ${message}`
            })
            .join('\n')
        )
      }
    )

    this.router.get(
      '/notifications',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.notifications'),
      async (req, res) => {
        const botId = req.params.botId
        const notifications = await this.notificationService.getInbox(botId)
        res.send(notifications)
      }
    )

    this.router.get(
      '/notifications/archive',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.notifications'),
      async (req, res) => {
        const botId = req.params.botId
        const notifications = await this.notificationService.getArchived(botId)
        res.send(notifications)
      }
    )

    this.router.post(
      '/notifications/:notificationId?/read',
      this.checkTokenHeader,
      this.needPermissions('write', 'bot.notifications'),
      async (req, res) => {
        const notificationId = req.params.notificationId
        const botId = req.params.botId

        notificationId
          ? await this.notificationService.markAsRead(notificationId)
          : await this.notificationService.markAllAsRead(botId)
        res.sendStatus(201)
      }
    )

    this.router.post(
      '/notifications/:notificationId?/archive',
      this.checkTokenHeader,
      this.needPermissions('write', 'bot.notifications'),
      async (req, res) => {
        const notificationId = req.params.notificationId
        const botId = req.params.botId
        notificationId
          ? await this.notificationService.archive(notificationId)
          : await this.notificationService.archiveAll(botId)
        res.sendStatus(201)
      }
    )

    this.router.get(
      '/versioning/pending',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.ghost_content'),
      async (req, res) => {
        res.send(await this.ghostService.forBot(req.params.botId).getPending())
      }
    )

    this.router.get(
      '/versioning/export',
      this.checkTokenHeader,
      this.needPermissions('read', 'bot.ghost_content'),
      async (req, res) => {
        const tarball = await this.ghostService.forBot(req.params.botId).exportArchive()
        const name = 'archive_' + req.params.botId.replace(/\W/gi, '') + '_' + Date.now() + '.tgz'
        res.writeHead(200, {
          'Content-Type': 'application/tar+gzip',
          'Content-Disposition': `attachment; filename=${name}`,
          'Content-Length': tarball.length
        })
        res.end(tarball)
      }
    )

    const archiveUploadMulter = multer({
      limits: {
        fileSize: 1024 * 1000 * 100 // 100mb
      }
    })

    // TODO WIP Partial progress towards importing tarballs from the UI

    // this.router.get(
    //   '/versioning/import',
    //   this.checkTokenHeader,
    //   this.needPermissions('write', 'bot.ghost_content'),
    //   archiveUploadMulter.single('file'),
    //   async (req, res) => {
    //     const buffer = req['file'].buffer
    //     const botId = req.params.botId
    //     await this.ghostService.forBot(botId).importArchive(buffer)
    //     res.sendStatus(200)
    //   }
    // )

    // Revision ID
    this.router.post(
      '/versioning/revert',
      this.checkTokenHeader,
      this.needPermissions('write', 'bot.ghost_content'),
      async (req, res) => {
        const revisionId = req.body.revision
        const filePath = req.body.filePath
        await this.ghostService.forBot(req.params.botId).revertFileRevision(filePath, revisionId)
        res.sendStatus(200)
      }
    )
  }
}
