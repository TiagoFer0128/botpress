import { BotDetails } from 'botpress/sdk'
import { Request } from 'express'

import { BotpressConfig } from '../config/botpress.config'

export interface IDisposeOnExit {
  disposeOnExit(): void
}

export interface IInitializeFromConfig {
  initializeFromConfig(config: BotpressConfig): void
}

export interface Workspace {
  name: string
  userSeq: number
  users: AuthUser[]
  roles: AuthRole[]
  defaultRole: string
  adminRole: string
  bots: string[]
  pipeline: Pipeline
}

export interface AuthConfig {
  strategy: string
  isFirstTimeUse: boolean
  authEndpoint: string
}

export type BasicAuthUser = Partial<AuthUser> & {
  email: string
  password: string
  salt: string
}

export type ExternalAuthUser = Partial<AuthUser> & {
  email: string
  provider: string
}

export interface CreatedUser {
  user: AuthUser
  password?: string
}

export interface AuthUser {
  email: string
  password?: string
  salt?: string
  role?: string
  firstname?: string
  lastname?: string
  fullName?: string
  company?: string
  last_ip?: string
  location?: string
  provider?: string
  last_logon?: Date
  created_on?: Date
  password_expired?: boolean
}

export interface AuthRule {
  res: string
  op: string
}

export interface AuthRole {
  id: string
  name: string
  description: string
  rules: Array<AuthRule>
}

export interface TokenUser {
  email: string
  isSuperAdmin: boolean
}

export type RequestWithUser = Request & {
  tokenUser?: TokenUser
  authUser?: AuthUser
}

export interface Bot {
  id: string
  name: string
  description: string
  category?: string
  disabled?: boolean
  private?: boolean
  details?: BotDetails
  version?: string
  author?: string
  license?: string
  created_at: string
  updated_at: string
  pipeline_status: BotPipelineStatus
}

export interface BotPipelineStatus {
  current_stage: {
    promoted_by: string | null
    promoted_at: string
    id: string
  }
  stage_request: {
    requested_on: string
    expires_on: string | null
    requested_by: string
    id: string
  } | null
}

export type Pipeline = Stage[]

export type StageAction = 'promote_copy' | 'promote_move'

export interface Stage {
  id: string
  label: string
  action: StageAction
}
