import { BotConfig, BotTemplate } from 'botpress/sdk'
import { BotCreationSchema, BotEditSchema } from 'common/validation'
import { BotLoader } from 'core/bot-loader'
import { BotConfigWriter } from 'core/config'
import { ConfigProvider } from 'core/config/config-loader'
import { Bot } from 'core/misc/interfaces'
import { Statistics } from 'core/stats'
import { TYPES } from 'core/types'
import { inject, injectable } from 'inversify'
import Joi from 'joi'

import { InvalidOperationError } from './auth/errors'
import { GhostService } from './ghost/service'

@injectable()
export class BotService {
  constructor(
    @inject(TYPES.Statistics) private stats: Statistics,
    @inject(TYPES.BotConfigWriter) private configWriter: BotConfigWriter,
    @inject(TYPES.BotLoader) private botLoader: BotLoader,
    @inject(TYPES.GhostService) private ghostService: GhostService,
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider
  ) {}

  async addBot(bot: Bot, botTemplate: BotTemplate): Promise<void> {
    this.stats.track('ce', 'addBot')

    const { error } = Joi.validate(bot, BotCreationSchema)
    if (error) {
      throw new InvalidOperationError(`An error occurred while creating the bot: ${error.message}`)
    }

    await this.configWriter.createFromTemplate(bot, botTemplate)
    await this.botLoader.mountBot(bot.id)
    this.botLoader.invalidateBotIds()
  }

  async updateBot(botId: string, bot: Bot): Promise<void> {
    this.stats.track('ce', 'updateBot')

    const { error } = Joi.validate(bot, BotEditSchema)
    if (error) {
      throw new InvalidOperationError(`An error occurred while updating the bot: ${error.message}`)
    }

    const actualBot = await this.configProvider.getBotConfig(botId)
    actualBot.name = bot.name
    actualBot.description = bot.description
    await this.configProvider.setBotConfig(botId, actualBot)
  }

  async deleteBot(botId: string) {
    await this.botLoader.unmountBot(botId)
    await this.ghostService.forBot(botId).deleteFolder('/')
  }

  async getBotById(botId: string): Promise<BotConfig> {
    return await this.configProvider.getBotConfig(botId)
  }
}
