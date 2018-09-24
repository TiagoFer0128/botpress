import os from 'os'
import chalk from 'chalk'
import { inject, injectable } from 'inversify'
import _ from 'lodash'
import moment from 'moment'
import util from 'util'

import { TYPES } from '../types'

import { LoggerPersister } from '.'
import { Logger, Level, LogEntry } from 'common/logging'

export type LoggerProvider = (module: string) => Promise<Logger>

@injectable()
// Suggestion: Would be best to have a CompositeLogger that separates the Console and DB loggers
export class PersistedConsoleLogger implements Logger {
  private botId: string | undefined

  constructor(
    @inject(TYPES.Logger_Name) private name: string,
    @inject(TYPES.IsProduction) private isProduction: boolean,
    @inject(TYPES.LoggerPersister) private loggerPersister: LoggerPersister
  ) {}

  forBot(botId: string): this {
    this.botId = botId
    return this
  }

  colors = {
    [Level.Info]: 'green',
    [Level.Warn]: 'yellow',
    [Level.Error]: 'red',
    [Level.Debug]: 'blue'
  }

  private print(level: Level, message: string, metadata: any) {
    const entry: LogEntry = {
      botId: this.botId,
      level: level.toString(),
      scope: this.name,
      message: message,
      metadata: metadata,
      timestamp: moment().toISOString()
    }

    this.loggerPersister.appendLog(entry)

    const serializedMetadata = metadata ? ' | ' + util.inspect(metadata, false, 2, true) : ''
    const time = moment().format('HH:mm:ss.SSS')

    const displayName = process.env.INDENT_LOGS ? this.name.substr(0, 15).padEnd(15, ' ') : this.name

    console.log(chalk`{grey ${time}} {${this.colors[level]}.bold ${displayName}} ${message}${serializedMetadata}`)
    this.botId = undefined
  }

  debug(message: string, metadata?: any): void {
    if (!this.isProduction) {
      this.print(Level.Debug, message, metadata)
    }
  }

  info(message: string, metadata?: any): void {
    this.print(Level.Info, message, metadata)
  }

  warn(message: string, metadata?: any): void {
    this.print(Level.Warn, message, metadata)
  }

  error(message: string, metadata?: any): void
  error(message: string, error: Error, metadata?: any): void {
    if (error instanceof Error) {
      let msg = message + ` [${error.name}, ${error.message}]`
      if (!this.isProduction && error.stack) {
        msg += chalk.grey(os.EOL + '----- STACK -----')
        msg += chalk.grey(os.EOL + error.stack)
      }

      return this.print(Level.Error, msg, metadata)
    }

    this.print(Level.Error, message, error)
  }
}
