import { Logger } from 'botpress/sdk'
import { ConfigProvider } from 'core/config/config-loader'
import { AuthConfig, RequestWithUser } from 'core/misc/interfaces'
import { AdminService } from 'core/services/admin/service'
import AuthService, { TOKEN_AUDIENCE } from 'core/services/auth/auth-service'
import { WorkspaceService } from 'core/services/workspace'
import { Request, RequestHandler, Router } from 'express'
import _ from 'lodash'

import { CustomRouter } from '.'
import { asyncMiddleware, checkTokenHeader, loadUser, success as sendSuccess } from './util'

const REVERSE_PROXY = !!process.env.REVERSE_PROXY

const getIp = (req: Request) =>
  (REVERSE_PROXY ? <string | undefined>req.headers['x-forwarded-for'] : undefined) || req.connection.remoteAddress

export class AuthRouter implements CustomRouter {
  public readonly router: Router
  private asyncMiddleware!: Function
  private checkTokenHeader!: RequestHandler
  private loadUser!: RequestHandler

  constructor(
    logger: Logger,
    private authService: AuthService,
    private adminService: AdminService,
    private configProvider: ConfigProvider,
    private workspaceService: WorkspaceService
  ) {
    this.router = Router({ mergeParams: true })
    this.asyncMiddleware = asyncMiddleware({ logger })
    this.checkTokenHeader = checkTokenHeader(this.authService, TOKEN_AUDIENCE)
    this.loadUser = loadUser(this.authService)

    this.setupRoutes()
  }

  login = async (req, res) => {
    const token = await this.authService.login(req.body.email, req.body.password, req.body.newPassword, getIp(req))

    return sendSuccess(res, 'Login successful', { token })
  }

  getAuthConfig = async () => {
    const usersList = this.workspaceService.listUsers()
    const isFirstTimeUse = !usersList || !usersList.length

    return { isFirstTimeUse } as AuthConfig
  }

  register = async (req, res) => {
    const config = await this.getAuthConfig()
    if (!config.isFirstTimeUse) {
      res.status(403).send(`Registration is disabled`)
    } else {
      const { email, password } = req.body
      const token = await this.authService.register(email, password)
      return sendSuccess(res, 'Registration successful', { token })
    }
  }

  sendConfig = async (req, res) => {
    return sendSuccess(res, 'Auth Config', await this.getAuthConfig())
  }

  getProfile = async (req, res) => {
    return sendSuccess(
      res,
      'Retrieved profile successfully',
      _.pick((req as RequestWithUser).dbUser, [
        'company',
        'email',
        'fullName',
        'id',
        'picture',
        'provider',
        'firstname',
        'lastname'
      ])
    )
  }

  updateProfile = async (req, res) => {
    await this.adminService.updateUserProfile(req.dbUser.id, req.body.firstname, req.body.lastname)
    return sendSuccess(res, 'Updated profile successfully')
  }

  getPermissions = async (req, res) => {
    return sendSuccess(
      res,
      "Retrieved team member's permissions successfully",
      await this.adminService.getUserPermissions((req as RequestWithUser).dbUser!.id)
    )
  }

  sendSuccess = async (req, res) => {
    return sendSuccess(res)
  }

  setupRoutes() {
    const router = this.router

    router.get('/config', this.asyncMiddleware(this.sendConfig))

    router.get('/ping', this.checkTokenHeader, this.asyncMiddleware(this.sendSuccess))

    router.post('/login', this.asyncMiddleware(this.login))

    router.post('/register', this.asyncMiddleware(this.register))

    router.get('/me/profile', this.checkTokenHeader, this.loadUser, this.asyncMiddleware(this.getProfile))

    router.post('/me/profile', this.checkTokenHeader, this.loadUser, this.asyncMiddleware(this.updateProfile))

    router.get(
      '/me/permissions/:teamId',
      this.checkTokenHeader,
      this.loadUser,
      this.asyncMiddleware(this.getPermissions)
    )
  }
}
