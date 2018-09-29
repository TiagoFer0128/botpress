import Bluebird from 'bluebird'
import _ from 'lodash'

import { SDK } from '.'

export default class HitlDb {
  knex: any

  constructor(private bp: SDK) {
    this.knex = bp.database
  }

  initialize() {
    if (!this.knex) {
      throw new Error('you must initialize the database before')
    }

    const table = 'hitl_messages'
    const alertSQLTextString = async () =>
      this.knex // sqlite doesn't support "alterColumn" https://www.sqlite.org/omitted.html
        .createTableIfNotExists('tmp_hitl_messages', function(table) {
          table.increments('id').primary()
          table
            .integer('session_id')
            .references('hitl_sessions.id')
            .onDelete('CASCADE')
          table.string('type')
          table.string('text', 640)
          table.jsonb('raw_message')
          table.enu('direction', ['in', 'out'])
          table.timestamp('ts')
        })
        .then(async () => {
          await this.knex.raw('INSERT INTO tmp_hitl_messages SELECT * FROM hitl_messages')
          await this.knex.schema.dropTable(table)
          await this.knex.raw('ALTER TABLE tmp_hitl_messages RENAME TO hitl_messages')
        })

    const migrateTable = () =>
      this.knex(table)
        .columnInfo('text')
        .then(async info => {
          const isPostgress = process.env.DATABASE === 'postgres'

          if (info.maxLength !== '640') {
            if (isPostgress) {
              return this.knex.schema.alterTable(table, t => {
                t.string('text', 640).alter()
              })
            } else {
              return alertSQLTextString()
            }
          }
        })

    return this.knex
      .createTableIfNotExists('hitl_sessions', function(table) {
        table.increments('id').primary()
        table.string('platform')
        table.string('userId')
        table.string('full_name')
        table.string('user_image_url')
        table.timestamp('last_event_on')
        table.timestamp('last_heard_on')
        table.boolean('paused')
        table.string('paused_trigger')
      })
      .then(() => {
        return this.knex.createTableIfNotExists('hitl_messages', function(table) {
          table.increments('id').primary()
          table
            .integer('session_id')
            .references('hitl_sessions.id')
            .onDelete('CASCADE')
          table.string('type')
          table.string('text', 640)
          table.jsonb('raw_message')
          table.enu('direction', ['in', 'out'])
          table.timestamp('ts')
        })
      })
      .then(migrateTable)
  }

  createUserSession(event) {
    let profileUrl = undefined
    let full_name =
      '#' +
      Math.random()
        .toString()
        .substr(2)

    if (event.user && event.user.first_name && event.user.last_name) {
      profileUrl = event.user.profile_pic || event.user.picture_url
      full_name = event.user.first_name + ' ' + event.user.last_name
    }

    const session = {
      platform: event.platform,
      userId: event.user.id,
      user_image_url: profileUrl,
      last_event_on: this.knex.date.now(),
      last_heard_on: this.knex.date.now(),
      paused: 0,
      full_name: full_name,
      paused_trigger: undefined
    }

    return this.knex('hitl_sessions')
      .insert(session)
      .returning('id')
      .then(([id]) =>
        this.knex('hitl_sessions')
          .where({ id })
          .then()
          .get(0)
      )
      .then(dbSession => ({ is_new_session: true, ...dbSession }))
  }

  async getUserSession(event) {
    const userId = (event.user && event.user.id) || event.raw.to

    if (!userId) {
      return undefined
    }

    return this.knex('hitl_sessions')
      .where({ platform: event.platform, userId: userId })
      .select('*')
      .limit(1)
      .then(users => {
        if (!users || users.length === 0) {
          return this.createUserSession(event)
        } else {
          return users[0]
        }
      })
  }

  getSession(sessionId) {
    return this.knex('hitl_sessions')
      .where({ id: sessionId })
      .select('*')
      .limit(1)
      .then(users => {
        if (!users || users.length === 0) {
          return undefined
        } else {
          return users[0]
        }
      })
  }

  toPlainObject(object) {
    // trims SQL queries from objects
    return _.mapValues(object, v => {
      return v.sql ? v.sql : v
    })
  }

  buildUpdate = direction => {
    const now = this.knex.date.now()
    return direction === 'in'
      ? { last_event_on: now }
      : {
          last_event_on: now,
          last_heard_on: now
        }
  }

  appendMessageToSession(event, sessionId, direction) {
    const message = {
      session_id: sessionId,
      type: event.type,
      text: event.text,
      raw_message: event.raw,
      direction: direction,
      ts: this.knex.date.now()
    }

    return Bluebird.join(
      this.knex('hitl_messages').insert(message),
      this.knex('hitl_sessions')
        .where({ id: sessionId })
        .update(this.buildUpdate(direction)),
      () => this.toPlainObject(message)
    )
  }

  setSessionPaused(paused, platform, userId, trigger, sessionId = undefined) {
    if (sessionId) {
      return this.knex('hitl_sessions')
        .where({ id: sessionId })
        .update({ paused: paused ? 1 : 0, paused_trigger: trigger })
        .then(() => parseInt(sessionId))
    } else {
      return this.knex('hitl_sessions')
        .where({ userId, platform })
        .update({ paused: paused ? 1 : 0, paused_trigger: trigger })
        .then(() => {
          return this.knex('hitl_sessions')
            .where({ userId, platform })
            .select('id')
        })
        .then(sessions => parseInt(sessions[0].id))
    }
  }

  isSessionPaused(platform, userId, sessionId = undefined) {
    const toBool = s => this.knex.bool.parse(s)

    if (sessionId) {
      return this.knex('hitl_sessions')
        .where({ id: sessionId })
        .select('paused')
        .then()
        .get(0)
        .then(s => s && toBool(s.paused))
    } else {
      return this.knex('hitl_sessions')
        .where({ userId, platform })
        .select('paused')
        .then()
        .get(0)
        .then(s => s && toBool(s.paused))
    }
  }

  getAllSessions(onlyPaused) {
    let condition = ''
    const knex2 = this.knex
    if (onlyPaused === true) {
      condition = 'hitl_sessions.paused = ' + this.knex.bool.true()
    }

    return this.knex
      .select('*')
      .from(function() {
        this.select([knex2.raw('max(id) as mId'), 'session_id', knex2.raw('count(*) as count')])
          .from('hitl_messages')
          .groupBy('session_id')
          .as('q1')
      })
      .join('hitl_messages', this.knex.raw('q1.mId'), 'hitl_messages.id')
      .join('hitl_sessions', this.knex.raw('q1.session_id'), 'hitl_sessions.id')
      .whereRaw(condition)
      .orderBy('hitl_sessions.last_event_on', 'desc')
      .limit(100)
      .then(results => ({
        total: 0,
        sessions: results
      }))
  }

  getSessionData(sessionId) {
    return this.knex('hitl_sessions')
      .where({ session_id: sessionId })
      .join('hitl_messages', 'hitl_messages.session_id', 'hitl_sessions.id')
      .orderBy('hitl_messages.id', 'desc')
      .limit(100)
      .select('*')
      .then(messages => _.orderBy(messages, ['id'], ['asc']))
  }
}
