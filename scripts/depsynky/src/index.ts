import yargs from '@bpinternal/yargs-extra'
import { bumpVersion } from './commands/bump-versions'
import { checkVersions } from './commands/check-versions'
import { syncVersions } from './commands/sync-versions'
import * as config from './config'
import { logger } from './utils/logging'

const onError = (thrown: unknown): never => {
  const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
  const message = err.stack ? `${err.message}\n${err.stack}` : err.message
  logger.error(message)
  process.exit(1)
}

const yargsFail = (msg: string, err: Error) => {
  err ? onError(err) : onError(msg)
}

process.on('unhandledRejection', onError)
process.on('uncaughtException', onError)

void yargs
  .command(
    'bump <package>',
    'Bump version of a package',
    () => yargs.positional('package', { type: 'string', demandOption: true }).options(config.bumpSchema),
    (argv) => {
      void bumpVersion(argv.package, argv)
    }
  )
  .command('sync', 'Sync versions of all packages', config.syncSchema, (argv) => {
    void syncVersions(argv)
  })
  .command('check', 'Check if all packages have the target version', config.checkSchema, (argv) => {
    void checkVersions(argv)
  })
  .strict()
  .help()
  .fail(yargsFail)
  .demandCommand(1)
  .parse()
