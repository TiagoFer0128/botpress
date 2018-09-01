import { EventDirection } from './common'
import { BotpressEvent } from './event'

export type MiddlewareDefinition = {
  name: string
  description: string
  order: number
  handler: Function
  direction: EventDirection
  enabled?: boolean
  /**
   * @deprecated since version 12.0
   */
  type?: string
  /**
   * @deprecated since version 12.0
   */
  module?: string
}

export type ModuleMetadata = {
  name: string
  version: string
  incomingMiddleware: Array<MiddlewareDefinition>
  outgoingMiddleware: Array<MiddlewareDefinition>
}

export type ModuleFile = {}

export type ModuleDefinition = {
  onInit: Function
  onReady: Function
  config: { [key: string]: ModuleConfigEntry }
  defaultConfigJson?: string
  serveFile?: ((path: string) => Promise<Buffer>)
}

export type ModuleConfigEntry = {
  type: 'bool' | 'any' | 'string'
  required: boolean
  default: any
  env?: string
}

export interface ChannelOutgoingHandler {
  processContentElement(element): Promise<BotpressEvent[]>
  readonly channel: string
}
