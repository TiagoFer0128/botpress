import { Logger } from 'botpress/sdk'
import { BotLoader } from 'core/bot-loader'
import { ModuleLoader } from 'core/module-loader'
import { inject, injectable, tagged } from 'inversify'
import Joi from 'joi'
import Knex from 'knex'
import _ from 'lodash'
import nanoid from 'nanoid'

import { BotConfigFactory, BotConfigWriter } from '../../config'
import Database from '../../database'
import { checkRule } from '../../misc/auth'
import { AuthRole, AuthRoleDb, AuthRule, AuthTeam, AuthTeamMembership, AuthUser, Bot } from '../../misc/interfaces'
import { BOTID_REGEX } from '../../misc/validation'
import { TYPES } from '../../types'
import { InvalidOperationError, NotFoundError, UnauthorizedAccessError } from '../auth/errors'
import { GhostService } from '../ghost/service'

import defaultRoles from './default-roles'
const TEAMS_TABLE = 'auth_teams'
const MEMBERS_TABLE = 'auth_team_members'
const ROLES_TABLE = 'auth_roles'
const USERS_TABLE = 'auth_users'
const BOTS_TABLE = 'srv_bots'

const BotValidationSchema = Joi.object().keys({
  id: Joi.string()
    .regex(BOTID_REGEX)
    .required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  team: Joi.number().required()
})

export interface TeamsServiceFacade {
  addMemberToTeam(userId: number, teamId: number, roleName: string)
  removeMemberFromTeam(userId, teamId)
  listUserTeams(userId: number)

  createTeamRole(teamId: number, role: AuthRole)
  deleteTeamRole(teamId: number, roleId: number)
  updateTeamRole(teamId: number, roleId: number, role: Partial<AuthRole>)
  listTeamRoles(teamId: number)

  addBot(teamId: number, bot: Bot): Promise<void>
  deleteBot(teamId: number, botId: string)
  listBots(teamId: number, offset?: number, limit?: number)

  createNewTeam(args: { userId: number; name?: string })
  getBotTeam(botId: string)
  deleteTeam(teamId: number)

  getInviteCode(teamId: number)
  refreshInviteCode(teamId: number)

  getUserPermissions(userId: number, teamId: number): Promise<AuthRule[]>
  getUserRole(userId: number, teamId: number)
  changeUserRole(userId: number, teamId: number, roleName: string)

  joinTeamFromInviteCode(userId: number, code: string)
  listTeamMembers(teamId: number)

  assertUserMember(userId: number, teamId: number)
  assertUserPermission(userId: number, teamId: number, resource: string, operation: string)
  assertUserNotMember(userId: number, teamId: number)
  assertRoleExists(teamId: number, roleName: string)
  assertUserRole(userId: number, teamId: number, roleName: string)
}

@injectable()
export default class BaseTeamsService implements TeamsServiceFacade {
  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'Auth Teams')
    private logger: Logger,
    @inject(TYPES.Database) private db: Database,
    @inject(TYPES.BotConfigFactory) private botConfigFactory: BotConfigFactory,
    @inject(TYPES.BotConfigWriter) private botConfigWriter: BotConfigWriter,
    @inject(TYPES.BotLoader) private botLoader: BotLoader,
    @inject(TYPES.GhostService) private ghostService: GhostService,
    @inject(TYPES.ModuleLoader) private moduleLoader: ModuleLoader
  ) {}

  get knex() {
    return this.db.knex!
  }

  async createNewTeam({ userId, name = 'Default Team' }: { userId: number; name?: string }) {
    const teamId = await this.knex.insertAndRetrieve<number>(TEAMS_TABLE, {
      name,
      invite_code: nanoid()
    })

    if (_.isArray(defaultRoles) && defaultRoles.length) {
      await this.knex.batchInsert(
        ROLES_TABLE,
        defaultRoles.map(role => {
          return { ...role, team: teamId, rules: JSON.stringify(role.rules) }
        })
      )
    }

    await this.addMemberToTeam(userId, teamId, 'owner')

    return teamId
  }

  async listUserTeams(userId: number) {
    return this.knex
      .from(function(this: Knex) {
        this.from(MEMBERS_TABLE)
          .where({ user: userId })
          .as('m')
      })
      .leftJoin(this.knex(TEAMS_TABLE).as('t'), 'm.team', 't.id')
      .leftJoin(this.knex(ROLES_TABLE).as('r'), 'm.role', 'r.id')
      .select(
        this.knex.raw('m.user as userId'),
        this.knex.raw('m.team as id'),
        this.knex.raw('r.name as role'),
        't.name'
      )
      .then()
  }

  async assertUserMember(userId: number, teamId: number) {
    const member = await this.getMembership({ user: userId, team: teamId }, ['id'])

    if (!member) {
      throw new UnauthorizedAccessError('Not a member of this team')
    }
  }

  async getUserRole(userId: number, teamId: number) {
    const member = await this.getMembership({ user: userId, team: teamId }, ['role'])

    if (!member) {
      throw new UnauthorizedAccessError('Not a member of this team')
    }

    const role = await this.getRole({ team: teamId, id: member.role! }, ['name'])

    return role.name!
  }

  async getUserPermissions(userId: number, teamId: number): Promise<AuthRule[]> {
    const roleName = await this.getUserRole(userId, teamId)

    const role = await this.getRole({ team: teamId, name: roleName }, ['rules'])

    return (role && JSON.parse(role.rules!)) || []
  }

  async listTeamMembers(teamId: number) {
    return this.knex
      .from(function(this: Knex) {
        this.from(MEMBERS_TABLE)
          .where({ team: teamId })
          .as('m')
      })
      .leftJoin(this.knex(USERS_TABLE).as('u'), 'm.user', 'u.id')
      .leftJoin(this.knex(ROLES_TABLE).as('r'), 'm.role', 'r.id')
      .select(
        'u.id',
        this.knex.raw('r.name as role'),
        'u.username',
        'u.picture',
        'u.email',
        'u.firstname',
        'u.lastname',
        'm.updated_at'
      )
      .then<Array<AuthUser & { role: string; updated_at: string }>>(res => res)
      .map(x => ({
        ...x,
        updated_at: undefined,
        fullName: [x.firstname, x.lastname].filter(Boolean).join(' ')
      }))
  }

  async assertUserPermission(userId: number, teamId: number, resource: string, operation: string) {
    const permissions = await this.getUserPermissions(userId, teamId)

    if (!checkRule(permissions, operation, resource)) {
      throw new UnauthorizedAccessError('User does not have permission to perform this operation')
    }
  }

  private async getMembership(where: {}, select?: Array<keyof AuthTeamMembership>) {
    return this.knex(MEMBERS_TABLE)
      .select(select || ['*'])
      .where(where)
      .limit(1)
      .then<Partial<AuthTeamMembership>[]>(res => res)
      .get(0)
  }

  private async getTeam(where: {}, select?: Array<keyof AuthTeam>): Promise<Partial<AuthTeam | undefined>> {
    return this.knex(TEAMS_TABLE)
      .select(select || ['*'])
      .where(where)
      .limit(1)
      .then<Partial<AuthTeam>[]>(res => res)
      .get(0)
  }

  async assertUserRole(userId: number, teamId: number, roleName: string) {
    const isMember = await this.getMembership({ user: userId, team: teamId, role: roleName }, ['role'])

    if (!isMember) {
      throw new UnauthorizedAccessError(`User does not have role ${roleName} in the team`)
    }
  }

  async listTeamRoles(teamId: number) {
    return this.knex(ROLES_TABLE)
      .select('id', 'name', 'description', 'rules', 'created_at', 'updated_at')
      .where({ team: teamId })
      .then<Array<AuthRoleDb>>(res => res)
      .map(
        r =>
          ({
            ...r,
            rules: JSON.parse(r.rules) as Array<AuthRule>
          } as AuthRole)
      )
  }

  async createTeamRole(teamId: number, role: AuthRole) {
    return this.knex(ROLES_TABLE)
      .insert({ ..._.pick(role, 'name', 'description'), team: teamId, rules: JSON.stringify(role.rules) })
      .then()
  }

  async updateTeamRole(teamId: number, roleId: number, role: Partial<AuthRole>) {
    const dbRole = await this.knex(ROLES_TABLE)
      .select('name')
      .where({ id: roleId, team: teamId })
      .then<AuthRoleDb[]>(res => res)
      .get(0)

    if (!dbRole) {
      throw new InvalidOperationError(`Unknown role ID ${roleId} for team ${teamId}`)
    }

    if (dbRole.name === 'owner') {
      throw new InvalidOperationError("You can't edit the owner role")
    }

    const patchRole: Partial<AuthRoleDb> = _.pick(role, 'description')
    if ('rules' in role) {
      patchRole.rules = JSON.stringify(role.rules)
    }

    return this.knex(ROLES_TABLE)
      .where('id', roleId)
      .update(patchRole)
      .then()
  }

  async deleteTeamRole(teamId: number, roleId: number) {
    const dbRole = await this.knex(ROLES_TABLE)
      .select('name')
      .where({ id: roleId, team: teamId })
      .then<AuthRole[]>(res => res)
      .get(0)

    if (!dbRole) {
      throw new InvalidOperationError(`Unknown role ID ${roleId} for team ${teamId}`)
    }

    if (dbRole.name === 'owner') {
      throw new InvalidOperationError("You can't delete the owner role")
    }

    return this.knex(ROLES_TABLE)
      .where('id', roleId)
      .delete()
      .then()
  }

  async assertUserNotMember(userId: number, teamId: number) {
    const member = await this.getMembership({ user: userId, team: teamId }, ['id'])

    if (member) {
      throw new InvalidOperationError('User is already part of the team')
    }
  }

  private async getRole(where: {}, select?: Array<keyof AuthRole>) {
    return this.knex(ROLES_TABLE)
      .select(select || ['*'])
      .where(where)
      .limit(1)
      .then<Partial<AuthRoleDb>[]>(res => res)
      .get(0)
  }

  async assertRoleExists(teamId: number, roleName: string) {
    const role = await this.getRole({ team: teamId, name: roleName }, ['id'])

    if (!role) {
      throw new InvalidOperationError(`Role "${roleName}" doesn't exist`)
    }
  }

  async addMemberToTeam(userId: number, teamId: number, roleName: string) {
    const role = await this.getRole({ team: teamId, name: roleName }, ['id'])
    return this.knex(MEMBERS_TABLE)
      .insert({ user: userId, team: teamId, role: role.id })
      .then()
  }

  async removeMemberFromTeam(userId, teamId) {
    return this.knex(MEMBERS_TABLE)
      .where({ user: userId, team: teamId })
      .delete()
      .then()
  }

  async changeUserRole(userId: number, teamId: number, roleName: string) {
    const role = await this.getRole({ team: teamId, name: roleName }, ['id'])
    return this.knex(MEMBERS_TABLE)
      .where({ user: userId, team: teamId })
      .update({ role: role.id })
      .then()
  }

  async deleteTeam(teamId: number) {
    return this.knex(TEAMS_TABLE)
      .where('id', teamId)
      .delete()
      .then()
  }

  async addBot(teamId: number, bot: Bot): Promise<void> {
    bot.team = teamId
    const { error } = Joi.validate(bot, BotValidationSchema)
    if (error) {
      throw new Error(`An error occurred while creating the bot: ${error.message}`)
    }

    await this.knex(BOTS_TABLE).insert(bot)
    const botConfig = this.botConfigFactory.createDefault({ id: bot.id, name: bot.name, description: bot.description })
    await this.botConfigWriter.writeToFile(botConfig)
    // TODO move this in  bot loader
    await this.ghostService.forBot(bot.id).sync(['actions', 'content-elements', 'flows', 'intents'])
    await this.botLoader.loadForBot(bot.id)
    await this.moduleLoader.loadModulesForBot(bot.id)
  }

  async getBotTeam(botId: string) {
    return this.knex(BOTS_TABLE)
      .select(['team'])
      .where({ id: botId })
      .limit(1)
      .then<Partial<Bot>[]>(res => res)
      .get(0)
      .then(bot => {
        return bot ? bot.team : undefined
      })
  }

  async listBots(teamId: number, offset: number = 0, limit: number = 100) {
    const bots = await this.knex(BOTS_TABLE)
      .where({ team: teamId })
      .offset(offset)
      .limit(limit)
      .select('id', 'name', 'description', 'created_at')
      .then<Array<Bot>>(res => res)

    return { count: bots.length, bots }
  }

  async deleteBot(teamId: number, botId: string) {
    await this.knex(BOTS_TABLE)
      .where({ team: teamId, id: botId })
      .delete()
      .then()
  }

  async getInviteCode(teamId: number) {
    const team = await this.getTeam({ id: teamId }, ['invite_code'])

    if (!team) {
      throw new NotFoundError(`Team ${teamId} not found`)
    }

    return {
      inviteCode: team.invite_code
    }
  }

  async refreshInviteCode(teamId: number) {
    const inviteCode = nanoid()

    await this.knex(TEAMS_TABLE)
      .where('id', teamId)
      .update({
        invite_code: inviteCode
      })
      .then()

    return {
      inviteCode
    }
  }

  async joinTeamFromInviteCode(userId: number, code: string) {
    const team = await this.getTeam({ invite_code: code }, ['id'])

    if (!team) {
      throw new NotFoundError('Team not found')
    }

    await this.assertUserNotMember(userId, team.id!)

    return this.addMemberToTeam(userId, team.id!, 'default').then(ids => ids && ids[0])
  }
}
