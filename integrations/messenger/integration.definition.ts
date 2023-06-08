import { IntegrationDefinition, messages } from '@botpress/sdk'
import { sentry as sentryHelpers } from '@botpress/sdk-addons'
import { z } from 'zod'

export default new IntegrationDefinition({
  name: 'messenger',
  version: '0.2.0',
  title: 'Messenger',
  description: 'This integration allows your bot to interact with Messenger.',
  icon: 'icon.svg',
  readme: 'readme.md',
  configuration: {
    schema: z.object({
      appId: z.string(),
      appSecret: z.string(),
      verifyToken: z.string(),
      pageId: z.string(),
      accessToken: z.string(),
    }),
  },
  channels: {
    channel: {
      messages: messages.defaults,
      tags: {
        messages: ['id'],
        conversations: ['id'],
      },
      conversation: { creation: { enabled: true, requiredTags: ['id'] } },
    },
  },
  tags: {
    users: ['id'],
  },
  actions: {},
  events: {},
  user: { creation: { enabled: true, requiredTags: ['id'] } },
  secrets: [...sentryHelpers.COMMON_SECRET_NAMES],
})
