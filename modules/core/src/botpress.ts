import * as path from 'path'
import * as fs from 'fs'
import { ModuleLoader } from './module-loader'
import packageJson from '../package.json'
import { inject, injectable, tagged } from 'inversify'
import { TYPES } from './misc/types'
import { Logger } from './misc/interfaces'
import HTTPServer from './server'
import Database from './database'

const MODULES_CONFIG_PATH = '/modules.config.json'

@injectable()
export class Botpress {
  projectLocation: string
  botpressPath: string
  configLocation: string

  modulesConfig: any
  version: string

  constructor(
    @inject(TYPES.Database) private database: Database,
    @inject(TYPES.HTTPServer) private httpServer: HTTPServer,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ModuleLoader) private moduleLoader: ModuleLoader
  ) {
    this.version = packageJson.version
    this.botpressPath = path.join(process.cwd(), 'dist')
    this.configLocation = path.join(this.botpressPath, '/config')
  }

  private async initialize() {
    this.trackStats()
    this.createDatabase()
    this.loadModules()
    this.startServer()
  }

  private async startServer() {
    await this.httpServer.start()
  }

  private trackStats(): any {
    // TODO
  }

  private createDatabase(): any {
    this.database.initialize({ type: 'sqlite', location: './sqlite/db.sqlite' })
  }

  private loadModules() {
    setInterval(async () => {
      const modules = await this.moduleLoader.getAvailableModules()
      console.log(modules)
    }, 5000)
  }

  start() {
    this.initialize()
  }
}
