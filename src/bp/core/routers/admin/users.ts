import { Logger } from 'botpress/sdk'
import AuthService from 'core/services/auth/auth-service'
import { WorkspaceService } from 'core/services/workspace-service'
import { Router } from 'express'
import Joi from 'joi'
import _ from 'lodash'

import { CustomRouter } from '..'
import { InvalidOperationError } from '../../services/auth/errors'
import { asyncMiddleware, success as sendSuccess, validateBodySchema } from '../util'

export class UsersRouter implements CustomRouter {
  public readonly router: Router

  private asyncMiddleware!: Function

  constructor(logger: Logger, private authService: AuthService, private workspace: WorkspaceService) {
    this.asyncMiddleware = asyncMiddleware({ logger })
    this.router = Router({ mergeParams: true })
    this.setupRoutes()
  }

  setupRoutes() {
    const router = this.router

    router.get(
      '/', // List users
      this.asyncMiddleware(async (req, res) => {
        const users = await this.workspace.listUsers()
        return sendSuccess(res, 'Retrieved users', users)
      })
    )

    router.post(
      '/', // Create user
      this.asyncMiddleware(async (req, res) => {
        await this.workspace.assertIsRootAdmin(req.authUser.role)
        validateBodySchema(
          req,
          Joi.object().keys({
            email: Joi.string()
              .email()
              .trim()
              .required()
          })
        )
        const email = req.body.email
        const alreadyExists = await this.authService.findUserByEmail(email, ['email'])

        if (alreadyExists) {
          throw new InvalidOperationError(`User ${email} is already taken`)
        }

        const tempPassword = await this.authService.createUser(email)

        return sendSuccess(res, 'User created successfully', {
          email,
          tempPassword
        })
      })
    )

    router.delete(
      '/:email', // Delete user
      this.asyncMiddleware(async (req, res) => {
        await this.workspace.assertIsRootAdmin(req.authUser.role)
        const { email } = req.params

        await this.workspace.deleteUser(email)
        return sendSuccess(res, 'User deleted', {
          email
        })
      })
    )

    router.get(
      '/reset/:userId',
      this.asyncMiddleware(async (req, res) => {
        await this.workspace.assertIsRootAdmin(req.authUser.role)
        const tempPassword = await this.authService.resetPassword(req.params.userId)
        return sendSuccess(res, 'Password reseted', {
          tempPassword
        })
      })
    )
  }
}
