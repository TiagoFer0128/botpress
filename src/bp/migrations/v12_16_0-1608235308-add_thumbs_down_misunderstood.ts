import * as sdk from 'botpress/sdk'
import { Migration, MigrationOpts } from 'core/services/migration'

const migration: Migration = {
  info: {
    description: 'Adds thumbs down as as reason in the misunderstood table',
    type: 'database'
  },
  up: async ({ bp }: MigrationOpts): Promise<sdk.MigrationResult> => {
    try {
      enum FLAG_REASON {
        auto_hook = 'auto_hook',
        action = 'action',
        manual = 'manual',
        thumbs_down = 'thumbs_down'
      }

      await bp.database.schema.alterTable('misunderstood', table => {
        table.enum('reason', Object.values(FLAG_REASON)).alter()
      })

      return { success: true, message: 'Field altered successfully' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
}

export default migration
