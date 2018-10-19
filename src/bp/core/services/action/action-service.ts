import { Logger } from 'botpress/sdk'
import { inject, injectable, tagged } from 'inversify'
import path from 'path'
import { VError } from 'verror'
import { NodeVM } from 'vm2'

import { GhostService } from '..'
import { createForAction } from '../../api'
import { TYPES } from '../../types'

import { ActionMetadata, extractMetadata } from './metadata'
import { VmRunner } from './vm'

@injectable()
export default class ActionService {
  constructor(
    @inject(TYPES.GhostService) private ghost: GhostService,
    @inject(TYPES.Logger)
    @tagged('name', 'Actions')
    private logger: Logger
  ) {}

  forBot(botId: string): ScopedActionService {
    return new ScopedActionService(this.ghost, this.logger, botId)
  }
}

type ActionLocation = 'local' | 'global'

export type ActionDefinition = {
  name: string
  isRemote: boolean
  location: ActionLocation
  metadata?: ActionMetadata
}

export class ScopedActionService {
  constructor(private ghost: GhostService, private logger, private botId: string) {}

  async listActions({ includeMetadata = false } = {}): Promise<ActionDefinition[]> {
    // node_production_modules are node_modules that are compressed for production
    const exclude = ['**/node_modules/**', '**/node_production_modules/**']
    const globalActionsFiles = await this.ghost.global().directoryListing('actions', '*.js', exclude)
    const localActionsFiles = await this.ghost.forBot(this.botId).directoryListing('actions', '*.js', exclude)

    const actions: ActionDefinition[] = (await Promise.map(globalActionsFiles, async file =>
      this.getActionDefinition(file, 'global', includeMetadata)
    )).concat(
      await Promise.map(localActionsFiles, async file => this.getActionDefinition(file, 'local', includeMetadata))
    )

    return actions
  }

  private async getActionDefinition(
    file: string,
    location: ActionLocation,
    includeMetadata: boolean
  ): Promise<ActionDefinition> {
    let action: ActionDefinition = {
      name: file.replace(/.js$/i, ''),
      isRemote: false,
      location: location
    }

    if (includeMetadata) {
      const script = await this.getActionScript(action)
      action = { ...action, metadata: extractMetadata(script) }
    }

    return action
  }

  private async getActionScript(action: ActionDefinition): Promise<string> {
    let script: string
    if (action.location === 'global') {
      script = await this.ghost.global().readFileAsString('actions', action.name + '.js')
    } else {
      script = await this.ghost.forBot(this.botId).readFileAsString('actions', action.name + '.js')
    }

    return script
  }

  async hasAction(actionName: string): Promise<boolean> {
    const actions = await this.listActions()
    return !!actions.find(x => x.name === actionName)
  }

  async runAction(actionName: string, dialogState: any, incomingEvent: any, actionArgs: any): Promise<any> {
    this.logger.forBot(this.botId).debug(`Running action "${actionName}"`)
    const action = await this.findAction(actionName)
    const code = await this.getActionScript(action)
    const api = await createForAction()

    const vm = new NodeVM({
      wrapper: 'none',
      sandbox: {
        bp: api,
        event: incomingEvent,
        state: dialogState,
        args: actionArgs
      },
      require: {
        external: true
      },
      timeout: 5000
    })

    const runner = new VmRunner()
    const botFolder = action.location === 'global' ? 'global' : 'bots/' + this.botId
    const dirPath = path.resolve(path.join(process.PROJECT_LOCATION, `/data/${botFolder}/actions/${actionName}`))

    return runner.runInVm(vm, code, dirPath).catch(err => {
      throw new VError(err, `An error occurred while executing the action "${actionName}"`)
    })
  }

  private async findAction(actionName: string): Promise<ActionDefinition> {
    const actions = await this.listActions()
    const action = actions.find(x => x.name === actionName)

    if (!action) {
      throw new Error(`Action "${actionName}" not found`)
    }

    return action
  }
}
