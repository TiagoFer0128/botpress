import { Container } from 'inversify'

import { TYPES } from './misc/types'
import { Logger } from './misc/interfaces'

import Database from './database'
import ConsoleLogger from './Logger'
import { ModuleLoader } from './module-loader'
import { Botpress } from './botpress'
import { types } from 'util'
import HTTPServer from './server'
import { FileConfigProvider, ConfigProvider } from './config-loader'

const container = new Container({ autoBindInjectable: true })

// Binds the Logger name auto-magically on injection based on the `name` @tagged attribute
// Or else from the Symbol of the class in which the logger is being injected in
container.bind<string>(TYPES.Logger_Name).toDynamicValue(ctx => {
  const targetName = ctx.currentRequest.parentRequest.target.name
  let loggerName = targetName && targetName.value()

  if (!loggerName) {
    // Was injected in a logger, which was injected in an other class
    // And that class has a service identifier, which may be a Symbol
    const endclass = ctx.currentRequest.parentRequest && ctx.currentRequest.parentRequest.parentRequest
    loggerName = endclass.serviceIdentifier && endclass.serviceIdentifier.toString().replace(/^Symbol\((.+)\)$/, '$1')
  }

  return loggerName || 'Unknown'
})

container.bind<Logger>(TYPES.Logger).to(ConsoleLogger)
container.bind<Database>(TYPES.Database).to(Database)
container.bind<ModuleLoader>(TYPES.ModuleLoader).to(ModuleLoader)
container.bind<Botpress>(TYPES.Botpress).to(Botpress)
container.bind<HTTPServer>(TYPES.HTTPServer).to(HTTPServer)
container.bind<ConfigProvider>(TYPES.ConfigProvider).to(FileConfigProvider)

export { container }
