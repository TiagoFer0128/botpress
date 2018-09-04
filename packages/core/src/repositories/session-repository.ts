import { inject, injectable } from 'inversify'

import Database from '../database'
import { TYPES } from '../misc/types'

export class DialogSession {
  constructor(public id: string, public state, public context, public event) {}
  // Timestamps are optionnal because they have default values in the database
  created_on?: Date
  modified_on?: Date
  active_on?: Date
}

export interface SessionRepository {
  insert(session: DialogSession): Promise<DialogSession>
  get(id: string): Promise<DialogSession>
  delete(id: string)
  update(session: DialogSession)
}

@injectable()
export class KnexSessionRepository implements SessionRepository {
  private readonly tableName = 'dialog_sessions'

  constructor(@inject(TYPES.Database) private database: Database) {}

  async insert(session: DialogSession): Promise<DialogSession> {
    const newSession = await this.database.knex.insertAndRetrieve<DialogSession>(
      this.tableName,
      {
        id: session.id,
        state: this.database.knex.json.set(session.state || {}),
        context: this.database.knex.json.set(session.context || {}),
        event: this.database.knex.json.set(session.event || {}),
        active_on: this.database.knex.date.now(),
        modified_on: this.database.knex.date.now(),
        created_on: this.database.knex.date.now()
      },
      ['state', 'context', 'event', 'id', 'active_on', 'modified_on', 'created_on']
    )

    if (newSession) {
      newSession.state = this.database.knex.json.get(newSession.state)
      newSession.context = this.database.knex.json.get(newSession.context)
      newSession.event = this.database.knex.json.get(newSession.event)
    }
    return newSession
  }

  async get(id: string): Promise<DialogSession> {
    const session = <DialogSession>await this.database
      .knex(this.tableName)
      .where({ id })
      .select('*')
      .get(0)
      .then()

    if (session) {
      session.state = this.database.knex.json.get(session.state)
      session.context = this.database.knex.json.get(session.context)
      session.event = this.database.knex.json.get(session.event)
    }
    return session
  }

  async update(session: DialogSession): Promise<void> {
    const now = this.database.knex.date.now()
    await this.database
      .knex(this.tableName)
      .where('id', session.id)
      .update({
        modified_on: now,
        state: this.database.knex.json.set(session.state),
        context: this.database.knex.json.set(session.context),
        event: this.database.knex.json.set(session.event)
      })
      .then()
  }

  async delete(id: string) {
    await this.database
      .knex(this.tableName)
      .where({ id })
      .del()
      .then()
  }
}
