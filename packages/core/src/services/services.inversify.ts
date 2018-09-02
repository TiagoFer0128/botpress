import { ContainerModule, interfaces } from 'inversify'

import { TYPES } from '../misc/types'

import ActionService from './action/action-service'
import AuthService from './auth/auth-service'
import TeamsService from './auth/teams-service'
import { CMSService } from './cms/cms-service'
import { DialogEngine } from './dialog/dialog-engine'
import FlowService from './dialog/flow-service'
import { InstructionFactory } from './dialog/instruction-factory'
import { InstructionProcessor } from './dialog/instruction-processor'
import { SessionService } from './dialog/session-service'
import { ObjectCache, StorageDriver } from './ghost'
import DiskStorageDriver from './ghost/disk-driver'
import MemoryObjectCache from './ghost/memory-cache'
import GhostService from './ghost/service'
import { HookService } from './hook/hook-service'
import { EventEngine } from './middleware/event-engine'
import { Queue } from './queue'
import MemoryQueue from './queue/memory-queue'
import RealtimeService from './realtime'

export const ServicesContainerModule = new ContainerModule((bind: interfaces.Bind) => {
  bind<ObjectCache>(TYPES.ObjectCache)
    .to(MemoryObjectCache)
    .inSingletonScope()

  bind<StorageDriver>(TYPES.StorageDriver)
    .to(DiskStorageDriver)
    .inSingletonScope()

  bind<GhostService>(TYPES.GhostService)
    .to(GhostService)
    .inSingletonScope()

  bind<FlowService>(TYPES.FlowService)
    .to(FlowService)
    .inSingletonScope()

  bind<CMSService>(TYPES.CMSService)
    .to(CMSService)
    .inSingletonScope()

  bind<ActionService>(TYPES.ActionService)
    .to(ActionService)
    .inSingletonScope()

  bind<Queue>(TYPES.Queue)
    .to(MemoryQueue)
    .inSingletonScope()

  bind<HookService>(TYPES.HookService)
    .to(HookService)
    .inSingletonScope()

  bind<EventEngine>(TYPES.EventEngine)
    .to(EventEngine)
    .inSingletonScope()

  bind<DialogEngine>(TYPES.DialogEngine)
    .to(DialogEngine)
    .inSingletonScope()

  bind<SessionService>(TYPES.SessionService)
    .to(SessionService)
    .inSingletonScope()

  bind<RealtimeService>(TYPES.RealtimeService).to(RealtimeService)

  bind<AuthService>(TYPES.AuthService)
    .to(AuthService)
    .inSingletonScope()

  bind<TeamsService>(TYPES.TeamsService)
    .to(TeamsService)
    .inSingletonScope()

  bind<InstructionProcessor>(TYPES.InstructionProcessor)
    .to(InstructionProcessor)
    .inSingletonScope()

  bind<InstructionFactory>(TYPES.InstructionFactory)
    .to(InstructionFactory)
    .inSingletonScope()
})
