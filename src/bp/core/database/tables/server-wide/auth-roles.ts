import { container } from 'core/app.inversify'
import { Table } from 'core/database/interfaces'
import communityRoles from 'core/services/admin/community-roles'
import { TYPES } from 'core/types'
import Knex from 'knex'

const insertRoles = async (knex: Knex, tableName: string, roles) => {
  return knex.batchInsert(
    tableName,
    roles.map((role, index) => {
      return { ...role, id: index + 1, team: 1, rules: JSON.stringify(role.rules) }
    })
  )
}

export class AuthRolesTable extends Table {
  name: string = 'auth_roles'

  bootstrap() {
    return this.knex
      .createTableIfNotExists(this.name, table => {
        table.increments('id')
        table.string('name').notNullable()
        table.text('description')
        table.json('rules').notNullable()
        table
          .integer('team')
          .references('auth_teams.id')
          .onDelete('CASCADE')
        table.unique(['team', 'name'])
        table.timestamps(true, true)
      })
      .then(async created => {
        // Pro submodule have its own seeding for auth roles
        const edition = container.get<string>(TYPES.BotpressEdition)
        if (created && edition === 'ce') {
          await insertRoles(this.knex, this.name, communityRoles)
        } else {
          const { roles } = await import('professional/services/admin/pro-roles')
          await insertRoles(this.knex, this.name, roles)
        }
        return created
      })
  }
}
