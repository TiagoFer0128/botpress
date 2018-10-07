import fse from 'fs-extra'
import glob from 'glob'
import { inject, injectable } from 'inversify'
import path from 'path'
import { VError } from 'verror'

import { TYPES } from '../../types'

import { GhostFileRevision, StorageDriver } from '.'

@injectable()
export default class DiskStorageDriver implements StorageDriver {
  constructor(@inject(TYPES.ProjectLocation) private projectLocation: string) {}

  resolvePath = p => path.resolve(this.projectLocation, p)

  async upsertFile(filePath: string, content: string | Buffer): Promise<void>
  async upsertFile(filePath: string, content: string | Buffer, recordRevision: boolean = false): Promise<void> {
    try {
      const folder = path.dirname(this.resolvePath(filePath))
      await fse.mkdirp(folder)
      await fse.writeFile(this.resolvePath(filePath), content)
    } catch (e) {
      throw new VError(e, `[Disk Storage] Error upserting file "${filePath}"`)
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    try {
      return fse.readFile(this.resolvePath(filePath))
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error(`[Disk Storage] File "${filePath}" not found`)
      }

      throw new VError(e, `[Disk Storage] Error reading file "${filePath}"`)
    }
  }

  async deleteFile(filePath: string): Promise<void>
  async deleteFile(filePath: string, recordRevision: boolean = false): Promise<void> {
    try {
      return fse.unlink(this.resolvePath(filePath))
    } catch (e) {
      throw new VError(e, `[Disk Storage] Error deleting file "${filePath}"`)
    }
  }

  async directoryListing(folder: string, exclude?: string | string[]): Promise<string[]> {
    try {
      await fse.access(this.resolvePath(folder), fse.constants.R_OK)
    } catch (e) {
      throw new VError(e, `[Disk Storage] No read access to directory "${folder}"`)
    }

    const options = { cwd: this.resolvePath(folder) }
    if (exclude) {
      options['ignore'] = exclude
    }

    try {
      return Promise.fromCallback<string[]>(cb => glob('**/*.*', options, cb))
    } catch (e) {
      throw new VError(e, `[Disk Storage] Error listing directory content for folder "${folder}"`)
    }
  }

  async deleteRevision(filePath: string, revision: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  listRevisions(pathpathPrefix: string): Promise<GhostFileRevision[]> {
    throw new Error('Method not implemented.')
  }
}
