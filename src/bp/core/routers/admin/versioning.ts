import { GhostService } from 'core/services'
import { AdminService } from 'core/services/admin/service'
import AuthService, { TOKEN_AUDIENCE } from 'core/services/auth/auth-service'
import { RequestHandler, Router } from 'express'
import multer from 'multer'

import { CustomRouter } from '..'
import { checkTokenHeader, needPermissions } from '../util'

export class VersioningRouter implements CustomRouter {
  public readonly router: Router

  private _checkTokenHeader: RequestHandler
  private _needPermissions: (operation: string, resource: string) => RequestHandler

  constructor(private adminService: AdminService, private authService: AuthService, private ghost: GhostService) {
    this._needPermissions = needPermissions(this.adminService)
    this._checkTokenHeader = checkTokenHeader(this.authService, TOKEN_AUDIENCE)

    this.router = Router({ mergeParams: true })
    this.setupRoutes()
  }

  setupRoutes() {
    this.router.get(
      '/pending',
      // TODO add "need super admin" once superadmin is implemented
      this._checkTokenHeader,
      // TODO generate export token in kvs
      async (req, res) => {
        res.send(await this.ghost.global().getPending())
      }
    )

    this.router.get(
      '/export',
      // this._checkTokenHeader,
      // TODO add "need super admin" once superadmin is implemented
      // TODO check that export token is valid in kvs
      async (req, res) => {
        const tarball = await this.ghost.global().exportArchive()

        res.writeHead(200, {
          'Content-Type': 'application/tar+gzip',
          'Content-Disposition': `attachment; filename=archive_${Date.now()}.tgz`,
          'Content-Length': tarball.length
        })
        res.end(tarball)
      }
    )


    // TODO WIP Partial progress towards importing tarballs from the UI

    // const archiveUploadMulter = multer({
    //   limits: {
    //     fileSize: 1024 * 1000 * 100 // 100mb
    //   }
    // })

    // this.router.get(
    //   '/import',
    //   this.checkTokenHeader,
    //   this.needPermissions('write', 'bot.ghost_content'),
    //   archiveUploadMulter.single('file'),
    //   async (req, res) => {
    //     const buffer = req['file'].buffer
    //     const botId = req.params.botId
    //     await this.ghost.forBot(botId).importArchive(buffer)
    //     res.sendStatus(200)
    //   }
    // )

    // Revision ID
    this.router.post(
      '/revert',
      this._checkTokenHeader,
      this._needPermissions('write', 'bot.ghost_content'),
      async (req, res) => {
        const revisionId = req.body.revision
        const filePath = req.body.filePath
        await this.ghost.forBot(req.params.botId).revertFileRevision(filePath, revisionId)
        res.sendStatus(200)
      }
    )
  }
}
