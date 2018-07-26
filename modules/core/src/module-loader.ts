import axios from 'axios'
import { ModuleMetadata } from 'botpress-module-sdk'
import { inject, injectable, tagged } from 'inversify'
import { Memoize, Throttle } from 'lodash-decorators'
import ms from 'ms'

import { ConfigProvider } from './config/config-loader'
import { ModuleConfigEntry, ModulesConfig } from './config/modules.config'
import { Logger } from './misc/interfaces'
import { TYPES } from './misc/types'

export type AvailableModule = {
  metadata: ModuleMetadata
  definition: ModuleConfigEntry
}

@injectable()
export class ModuleLoader {
  private available: Map<string, AvailableModule> = new Map()

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'ModuleLoader')
    private logger: Logger,
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider
  ) {}

  @Memoize()
  private async loadConfiguration(): Promise<ModulesConfig> {
    return this.configProvider.getModulesConfig()
  }

  @Memoize()
  private async alertUnavailableModule(moduleUrl: string) {
    this.logger.warn(`Module at "${moduleUrl}" is not available`)
  }

  @Throttle(ms('5m'))
  async getAvailableModules(): Promise<AvailableModule[]> {
    const config = await this.loadConfiguration()
    this.available = new Map()

    for (const module of config.modules) {
      try {
        const { data } = await axios.get(`${module.url}/register`)
        const metadata = <ModuleMetadata>data

        // TODO Do more sophisticated check if metadata is valid
        if (!metadata || !metadata.name) {
          this.logger.error(`Invalid metadata received from module at "${module.url}". This module will be ignored.`)
          continue
        }

        const moduleName = metadata.name.toLowerCase()
        if (this.available.has(moduleName)) {
          this.logger.error(`Duplicated module "${moduleName}". This one will be ignored ("${module.url}".)`)
        } else {
          this.available.set(moduleName, {
            metadata: metadata,
            definition: module
          })
        }
      } catch (err) {
        this.alertUnavailableModule(module.url)
      }
    }

    return Array.from(this.available.values())
  }

  get availableModules() {
    return Array.from(this.available.values())
  }
}
