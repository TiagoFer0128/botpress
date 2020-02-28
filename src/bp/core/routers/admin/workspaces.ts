import { Logger } from 'botpress/sdk'
import { defaultPipelines } from 'common/defaults'
import { CreateWorkspace } from 'common/typings'
import { WorkspaceCreationSchema } from 'common/validation'
import { ConfigProvider } from 'core/config/config-loader'
import { InvalidOperationError } from 'core/services/auth/errors'
import { BotService } from 'core/services/bot-service'
import { ROLLOUT_STRATEGIES, WorkspaceService } from 'core/services/workspace-service'
import { Router } from 'express'
import Joi from 'joi'
import _ from 'lodash'

import { CustomRouter } from '../customRouter'
import { NotFoundError } from '../errors'

export class WorkspacesRouter extends CustomRouter {
  constructor(
    private logger: Logger,
    private workspaceService: WorkspaceService,
    private botService: BotService,
    private configProvider: ConfigProvider
  ) {
    super('Workspace', logger, Router({ mergeParams: true }))
    this.setupRoutes()
  }

  setupRoutes() {
    const router = this.router
    router.get(
      '/',
      this.asyncMiddleware(async (req, res) => {
        res.send(await this.workspaceService.getWorkspaces())
      })
    )

    router.post(
      '/',
      this.asyncMiddleware(async (req, res) => {
        if (!process.IS_PRO_ENABLED) {
          throw new InvalidOperationError(`Botpress Pro must be enabled`)
        }

        const { error } = Joi.validate(req.body, WorkspaceCreationSchema)
        if (error) {
          throw new InvalidOperationError(`An error occurred while creating the workspace: ${error.message}`)
        }

        await this.workspaceService.createWorkspace(req.body as CreateWorkspace)
        res.sendStatus(200)
      })
    )

    router.post(
      '/:workspaceId',
      this.asyncMiddleware(async (req, res) => {
        const { workspaceId } = req.params
        const { name, description } = req.body

        const { error } = Joi.validate(req.body, {
          name: Joi.string()
            .max(50)
            .required(),
          description: Joi.string()
            .max(500)
            .allow('')
        })

        if (error) {
          throw new InvalidOperationError(`An error occurred while updating the workspace: ${error.message}`)
        }

        await this.workspaceService.mergeWorkspaceConfig(workspaceId, { name, description })
        res.sendStatus(200)
      })
    )

    router.post(
      '/:workspaceId/pipeline',
      this.asyncMiddleware(async (req, res) => {
        const { workspaceId } = req.params
        const { pipelineId, resetStage, updateCustom } = req.body

        if (updateCustom) {
          const { pipeline } = req.body

          await this.workspaceService.mergeWorkspaceConfig(workspaceId, { pipeline })
        } else if (pipelineId !== 'custom') {
          if (!defaultPipelines[pipelineId]) {
            throw new InvalidOperationError(`Unknown pipeline "${pipelineId}"`)
          }

          const partialData = { pipeline: defaultPipelines[pipelineId] }
          await this.workspaceService.mergeWorkspaceConfig(workspaceId, partialData)
        }

        if (resetStage) {
          const pipeline = await this.workspaceService.getPipeline(workspaceId)
          const bots = await this.workspaceService.getBotRefs(workspaceId)

          if (pipeline && bots.length) {
            const current_stage = {
              id: pipeline[0].id,
              promoted_on: new Date(),
              promoted_by: req.tokenUser!.email
            }

            for (const bot of bots) {
              await this.configProvider.mergeBotConfig(bot, { pipeline_status: { current_stage } })
            }
          }
        }

        res.sendStatus(200)
      })
    )

    router.post(
      '/:workspaceId/delete',
      this.asyncMiddleware(async (req, res) => {
        const { workspaceId } = req.params

        const workspace = await this.workspaceService.findWorkspace(workspaceId)

        await this.logger.info(`Deleting workspace ${workspaceId}`)
        await this.workspaceService.deleteWorkspace(workspaceId)

        if (workspace.bots.length) {
          await this.logger.info(`Deleting associated bots: ${workspace.bots.join(', ')}`)

          for (const bot of workspace.bots) {
            await this.botService.deleteBot(bot)
          }
        }

        res.sendStatus(200)
      })
    )

    router.get(
      '/:workspaceId/rollout',
      this.asyncMiddleware(async (req, res) => {
        const { workspaceId } = req.params
        res.send(await this.workspaceService.getWorkspaceRollout(workspaceId))
      })
    )

    router.post(
      '/:workspaceId/rollout/:rolloutStrategy',
      this.asyncMiddleware(async (req, res) => {
        const { workspaceId, rolloutStrategy } = req.params

        if (!ROLLOUT_STRATEGIES.includes(rolloutStrategy)) {
          throw new InvalidOperationError(`Unknown strategy "${rolloutStrategy}"`)
        }

        await this.workspaceService.mergeWorkspaceConfig(workspaceId, { rolloutStrategy })
        res.sendStatus(200)
      })
    )

    router.post(
      '/:workspaceId/resetInvite',
      this.asyncMiddleware(async (req, res) => {
        const { workspaceId } = req.params
        const { inviteLimit } = req.body

        res.send(await this.workspaceService.resetInviteCode(workspaceId, inviteLimit))
      })
    )
  }
}
