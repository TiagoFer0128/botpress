import { inject, injectable } from 'inversify'

import Database from '../database'
import { TYPES } from '../misc/types'

export class Notification {
  constructor(
    public botId: string,
    public message: string,
    public level: string,
    public moduleId: string,
    public moduleIcon: string,
    public moduleName: string,
    public redirectUrl: string
  ) {}

  public id?: string
  public created_on?: string
  public modified_on?: string
  public read = false
  public archived = false
}

type DefaultGetOptions = { archived?: boolean; read?: boolean }

export interface NotificationsRepository {
  getBydId(botId: string, id: string): Promise<Notification>
  getAll(botId: string, options?: DefaultGetOptions): Promise<Notification[]>
  insert(botId: string, notification: Notification): Promise<Notification>
  update(botId: string, notification: Notification): Promise<void>
  deleteById(botId: string, id: string): Promise<void>
}

@injectable()
export class KnexNotificationsRepository implements NotificationsRepository {
  private readonly TABLE_NAME = 'srv_notifications'

  constructor(@inject(TYPES.Database) private database: Database) {}

  async getBydId(botId: string, id: string): Promise<Notification> {
    return (await this.database
      .knex(this.TABLE_NAME)
      .select('*')
      .where({ botId })
      .andWhere({ id })
      .then()) as Notification
  }

  async getAll(botId: string, options?: DefaultGetOptions): Promise<Notification[]> {
    let query = this.database.knex(this.TABLE_NAME).select('*')
    query = query.where({ botId })

    const { archived, read } = options!

    if (archived) {
      query = query.andWhere('archived', archived)
    }
    if (read) {
      query = query.andWhere('read', read)
    }
    query.limit(250)

    return (await query.then()) as Notification[]
  }

  async insert(botId: string, notification: Notification): Promise<Notification> {
    notification.botId = botId
    return (await this.database.knex.insertAndRetrieve(this.TABLE_NAME, notification, [
      'id',
      'botId',
      'message',
      'level',
      'module_id',
      'module_icon',
      'module_name',
      'redirect_url',
      'created_on',
      'read',
      'archived'
    ])) as Notification
  }

  async update(botId: string, notification: Notification): Promise<void> {
    await this.database
      .knex(this.TABLE_NAME)
      .where({ botId })
      .andWhere({ id: notification.id })
      .update(notification)
      .then()
  }

  async deleteById(botId: string, id: string): Promise<void> {
    await this.database
      .knex(this.TABLE_NAME)
      .where({ botId })
      .andWhere({ id })
      .del()
      .then()
  }
}
