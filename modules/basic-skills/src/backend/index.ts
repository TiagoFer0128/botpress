import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import choice from './choice'
import setup from './setup'
import slotExtraction from './slot'

export type Extension = {}

export type SDK = typeof sdk & Extension

const onServerStarted = async (bp: SDK) => {}

const onServerReady = async (bp: SDK) => {
  await setup(bp)
}

const skillsToRegister: sdk.Skill[] = [
  {
    id: 'choice',
    name: 'Choice',
    flowGenerator: choice.generateFlow
  },
  {
    id: 'slot',
    name: 'Slot Extraction',
    flowGenerator: slotExtraction.generateFlow
  }
]

const entryPoint: sdk.ModuleEntryPoint = {
  onServerStarted,
  onServerReady,
  definition: {
    name: 'basic-skills',
    menuIcon: 'fiber_smart_record',
    fullName: 'Basic Skills',
    homepage: 'https://botpress.io',
    noInterface: true,
    plugins: [],
    moduleView: { stretched: true }
  },
  skills: skillsToRegister
}

export default entryPoint
