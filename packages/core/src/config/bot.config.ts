export interface LogsConfig {
  expiration: string
}

export interface DialogConfig {
  timeoutInterval: string
}

export type BotConfig = {
  name: string
  active: boolean
  description?: string
  author?: string
  version: string
  license?: string
  imports: {
    modules: string[]
    contentTypes: string[]
    incomingMiddleware: string[]
    outgoingMiddleware: string[]
  }
  conversationLifetime: string
  dialog?: DialogConfig
  logs?: LogsConfig
}
