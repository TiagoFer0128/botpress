import Knex from 'knex'

import { Table } from '../interfaces'

import {
  DialogSessionTable,
  EventsTable,
  GhostFilesTable,
  GhostRevisionsTable,
  KeyValueStoreTable,
  LogsTable,
  NotificationsTable
} from './bot-specific'

import { ChannelUsersTable, DataRetentionTable, MigrationsTable, ServerMetadataTable } from './server-wide'

const tables: (typeof Table)[] = [
  MigrationsTable,
  ServerMetadataTable,
  ChannelUsersTable,

  LogsTable,
  ChannelUsersTable,
  DialogSessionTable,
  GhostFilesTable,
  GhostRevisionsTable,
  NotificationsTable,
  KeyValueStoreTable,
  DataRetentionTable,
  EventsTable
]

export default <(new (knex: Knex) => Table)[]>tables
