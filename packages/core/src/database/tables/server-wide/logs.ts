import { Table } from '../../interfaces'
export default class LogsTable extends Table {
  name: string = 'srv_logs'
  async bootstrap() {
    let created = false
    await this.knex.createTableIfNotExists(this.name, table => {
      table.string('timestamp')
      table.string('level')
      table.string('scope')
      table.text('message')
      table.text('metadata')
      created = true
    })
    return created
  }
}
