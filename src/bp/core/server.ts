import bodyParser from 'body-parser'
import { AxiosBotConfig, Logger, RouterOptions } from 'botpress/sdk'
import LicensingService from 'common/licensing-service'
import cors from 'cors'
import errorHandler from 'errorhandler'
import express from 'express'
import rewrite from 'express-urlrewrite'
import { createServer, Server } from 'http'
import { inject, injectable, tagged } from 'inversify'
import path from 'path'
import portFinder from 'portfinder'

import { ConfigProvider } from './config/config-loader'
import { ModuleLoader } from './module-loader'
import { BotRepository } from './repositories'
import { AdminRouter, AuthRouter, BotsRouter, ModulesRouter } from './routers'
import { ShortLinksRouter } from './routers/shortlinks'
import { GhostService } from './services'
import ActionService from './services/action/action-service'
import { AdminService } from './services/admin/service'
import AuthService from './services/auth/auth-service'
import { CMSService } from './services/cms/cms-service'
import { FlowService } from './services/dialog/flow/service'
import { SkillService } from './services/dialog/skill/service'
import { LogsService } from './services/logs/service'
import MediaService from './services/media'
import { NotificationsService } from './services/notification/service'
import { TYPES } from './types'
const BASE_API_PATH = '/api/v1'

const isProd = process.env.NODE_ENV === 'production'

@injectable()
export default class HTTPServer {
  public readonly httpServer: Server
  public readonly app: express.Express

  private readonly authRouter: AuthRouter
  private readonly adminRouter: AdminRouter
  private readonly modulesRouter: ModulesRouter
  private readonly botsRouter: BotsRouter
  private readonly shortlinksRouter: ShortLinksRouter

  constructor(
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider,
    @inject(TYPES.Logger)
    @tagged('name', 'HTTP')
    private logger: Logger,
    @inject(TYPES.IsProduction) isProduction: boolean,
    @inject(TYPES.BotRepository) botRepository: BotRepository,
    @inject(TYPES.CMSService) cmsService: CMSService,
    @inject(TYPES.FlowService) flowService: FlowService,
    @inject(TYPES.ActionService) actionService: ActionService,
    @inject(TYPES.ModuleLoader) moduleLoader: ModuleLoader,
    @inject(TYPES.AuthService) private authService: AuthService,
    @inject(TYPES.AdminService) private adminService: AdminService,
    @inject(TYPES.MediaService) mediaService: MediaService,
    @inject(TYPES.LogsService) logsService: LogsService,
    @inject(TYPES.NotificationsService) notificationService: NotificationsService,
    @inject(TYPES.SkillService) skillService: SkillService,
    @inject(TYPES.GhostService) ghostService: GhostService,
    @inject(TYPES.LicensingService) licenseService: LicensingService
  ) {
    this.app = express()

    if (!isProduction) {
      this.app.use(errorHandler())
    }

    this.httpServer = createServer(this.app)

    this.modulesRouter = new ModulesRouter(moduleLoader, skillService)
    this.authRouter = new AuthRouter(this.logger, this.authService, this.adminService)
    this.adminRouter = new AdminRouter(this.logger, this.authService, this.adminService, licenseService)
    this.shortlinksRouter = new ShortLinksRouter()
    this.botsRouter = new BotsRouter({
      actionService,
      botRepository,
      cmsService,
      flowService,
      mediaService,
      logsService,
      notificationService,
      authService,
      adminService,
      ghostService
    })
  }

  resolveAsset = file => path.resolve(process.PROJECT_LOCATION, 'assets', file)

  async start() {
    const botpressConfig = await this.configProvider.getBotpressConfig()
    const config = botpressConfig.httpServer

    this.app.use(
      // TODO FIXME Conditionally enable this
      bodyParser.json({
        limit: config.bodyLimit
      })
    )

    this.app.use(
      bodyParser.urlencoded({
        extended: true
      })
    )

    if (config.cors && config.cors.enabled) {
      this.app.use(cors(config.cors.origin ? { origin: config.cors.origin } : {}))
    }

    this.app.use('/assets', express.static(this.resolveAsset('')))
    this.app.use(rewrite('/:app/:botId/*env.js', '/api/v1/bots/:botId/:app/js/env.js'))

    this.app.use(`${BASE_API_PATH}/auth`, this.authRouter.router)
    this.app.use(`${BASE_API_PATH}/admin`, this.adminRouter.router)
    this.app.use(`${BASE_API_PATH}/modules`, this.modulesRouter.router)
    this.app.use(`${BASE_API_PATH}/bots/:botId`, this.botsRouter.router)
    this.app.use(`/s`, this.shortlinksRouter.router)

    this.app.use((err, req, res, next) => {
      const statusCode = err.status || 500
      const code = err.code || 'BP_000'
      const message = (err.code && err.message) || 'Unexpected error'
      const devOnly = isProd
        ? {}
        : {
            stack: err.stack,
            full: err.message
          }

      res.status(statusCode).json({
        status: 'error',
        code,
        type: err.type || Object.getPrototypeOf(err).name || 'Exception',
        message,
        docs: err.docs || undefined,
        ...devOnly
      })
    })

    this.setupStaticRoutes(this.app)

    process.HOST = config.host
    process.PORT = await portFinder.getPortPromise({ port: config.port })
    if (process.PORT !== config.port) {
      this.logger.warn(`Configured port ${config.port} is already in use. Using next port available: ${process.PORT}`)
    }

    const hostname = config.host === 'localhost' ? undefined : config.host
    await Promise.fromCallback(callback => {
      this.httpServer.listen(process.PORT, hostname, config.backlog, callback)
    })

    return this.app
  }

  setupStaticRoutes(app) {
    app.get('/studio', (req, res, next) => res.redirect('/admin'))

    app.use('/:app(studio)/:botId', express.static(this.resolveAsset('ui-studio/public')))
    app.use('/:app(lite)/:botId?', express.static(this.resolveAsset('ui-studio/public/lite')))
    app.use('/:app(lite)/:botId', express.static(this.resolveAsset('ui-studio/public')))

    app.get(['/:app(studio)/:botId/*'], (req, res) => {
      res.contentType('text/html')
      res.sendFile(this.resolveAsset('ui-studio/public/index.html'))
    })

    app.use('/admin', express.static(this.resolveAsset('ui-admin/public')))

    app.get(['/admin', '/admin/*'], (req, res) => {
      res.contentType('text/html')
      res.sendFile(this.resolveAsset('ui-admin/public/index.html'))
    })

    app.get('/api/community/hero', (req, res) => res.send({ hidden: true }))
    app.get('/', (req, res) => res.redirect('/admin'))
  }

  createRouterForBot(router: string, options: RouterOptions) {
    return this.botsRouter.getNewRouter(router, options)
  }

  createShortLink(name: string, destination: string, params: any) {
    this.shortlinksRouter.createShortLink(name, destination, params)
  }

  deleteShortLink(name: string) {
    this.shortlinksRouter.deleteShortLink(name)
  }

  async getAxiosConfigForBot(botId: string): Promise<AxiosBotConfig> {
    return {
      baseURL: `http://${process.HOST || 'localhost'}:${process.PORT}/api/v1/bots/${botId}`
    }
  }
}
