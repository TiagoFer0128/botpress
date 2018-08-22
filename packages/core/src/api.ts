import { BotpressEvent } from 'botpress-module-sdk'
import { inject, injectable, tagged } from 'inversify'

import { container } from './app.inversify'
import Database from './database'
import { Logger } from './misc/interfaces'
import { TYPES } from './misc/types'
import { ModuleLoader } from './module-loader'
import { BotRepository } from './repositories/bot-repository'
import { BotRouter } from './router/bot-router'
import { CMSService } from './services/cms/cms-service'
import { DialogEngine } from './services/dialog/engine'
import FlowService from './services/dialog/flow-service'
import { EventEngine } from './services/middleware/event-engine'
import { MiddlewareService } from './services/middleware/middleware-service'

// TODO: The UI doesn't support multi-bots yet
const BOT_ID = 'bot123'

export class HttpApi {
  constructor(private botRouter: BotRouter) {}

  get router() {
    // TODO Implement that properly
    return this.botRouter.router
  }

  createShortLink() {}
}

export class EventAPI {
  constructor(private eventEngine: EventEngine) {}

  load(middleware: []) {
    return this.eventEngine.forBot(BOT_ID).load(middleware)
  }

  sendIncoming(event) {
    return this.eventEngine.forBot(BOT_ID).sendIncoming(event)
  }

  sendOutgoing(event) {
    return this.eventEngine.forBot(BOT_ID).sendOutgoing(event)
  }
}

export class DialogAPI {
  constructor(private dialogEngine: DialogEngine) {}

  processMessage(sessionID: string, event: BotpressEvent) {
    return this.dialogEngine.forBot(BOT_ID).processMessage(sessionID, event)
  }
}

export class ModuleAPI {
  constructor(private moduleLoader: ModuleLoader) {}

  getConfigurator(moduleId: string) {}
}

export class ConsoleAPI {
  constructor(private logger: Logger) {}

  debug(msg) {
    this.logger.debug(msg)
  }

  info(msg) {
    this.logger.info(msg)
  }
}

/**
 * Socket.IO API to emit events and listen
 */
export class RealTimeAPI {
  emit() {}
}

@injectable()
export class BotpressAPI {
  console: ConsoleAPI
  http: HttpApi
  events: EventAPI
  dialog: DialogAPI
  module: ModuleAPI
  realtime: RealTimeAPI
  database: Database

  constructor(
    @inject(TYPES.BotRepository) botRepository: BotRepository,
    @inject(TYPES.CMSService) cmsService: CMSService,
    @inject(TYPES.DialogEngine) dialogEngine: DialogEngine,
    @inject(TYPES.Database) db: Database,
    @inject(TYPES.FlowService) flowService: FlowService,
    @inject(TYPES.EventEngine) eventEngine: EventEngine,
    @inject(TYPES.MiddlewareService) mwareService: MiddlewareService,
    @inject(TYPES.ModuleLoader) moduleLoader: ModuleLoader,
    @inject(TYPES.Logger) logger: Logger
  ) {
    const botRouter = new BotRouter(botRepository, mwareService, cmsService, flowService)

    this.http = new HttpApi(botRouter)
    this.events = new EventAPI(eventEngine)
    this.dialog = new DialogAPI(dialogEngine)
    this.module = new ModuleAPI(moduleLoader)
    this.realtime = new RealTimeAPI()
    this.console = new ConsoleAPI(logger)
    this.database = db
  }
}

export default () => {
  return container.get<BotpressAPI>(TYPES.BotpressAPI)
}
