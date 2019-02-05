import 'bluebird-global'
import 'reflect-metadata'
import tmp from 'tmp'

import { PersistedConsoleLogger } from '../logger'
import { createSpyObject, MockObject } from '../misc/utils'

import Database from '.'

const TEST_DATABASE = 'botpress_tests'

const logger: MockObject<PersistedConsoleLogger> = createSpyObject<PersistedConsoleLogger>()

export type DatabaseTestSuite = ((database: Database) => void)

export function createDatabaseSuite(suiteName: string, suite: DatabaseTestSuite) {
  const sqlitePath = tmp.fileSync().name
  const sqlite = new Database(logger.T)
  const postgres = new Database(logger.T)

  describe(`DB[SQLite] ${suiteName}`, async () => {
    beforeAll(async () => {
      await sqlite.initialize('sqlite', sqlitePath)

      await sqlite.bootstrap()
      await sqlite.seedForTests()
    })

    afterAll(async () => {
      await sqlite.teardownTables()
      await sqlite.knex.destroy()
    })

    afterEach(async () => {
      await sqlite.teardownTables()
      await sqlite.bootstrap()
      await sqlite.seedForTests()
    })

    await suite(sqlite)
  })

  describe(`DB[Postgres] ${suiteName}`, () => {
    beforeAll(async () => {
      await postgres.initialize('postgres', process.env.DATABASE_URL)

      await postgres.bootstrap()
      await postgres.seedForTests()
    })

    afterAll(async () => {
      await postgres.teardownTables()
      await postgres.knex.destroy()
    })

    afterEach(async () => {
      await postgres.teardownTables()
      await postgres.bootstrap()
      await postgres.seedForTests()
    })

    suite(postgres)
  })
}
