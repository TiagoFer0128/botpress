import { inject, injectable } from 'inversify'
import _ from 'lodash'
import Mustache from 'mustache'

import { Event } from '../../sdk/impl'
import { TYPES } from '../../types'
import { converseEvents } from '../converse'
import { EventEngine } from '../middleware/event-engine'

import { CMS } from './cms'

@injectable()
export class ContentElementSender {
  constructor(@inject(TYPES.CMS) private cms: CMS, @inject(TYPES.EventEngine) private eventEngine: EventEngine) {}

  // TODO: Test if the payload is parsing its template properly
  async sendContent(contentId: string, args: object = {}, event) {
    process.ASSERT_LICENSED()
    contentId = contentId.replace(/^#?/i, '')

    const { botId, channel, target, threadId } = event

    let renderedElements

    if (contentId.startsWith('!')) {
      const content = await this.cms.getContentElement(botId, contentId.substr(1)) // TODO handle errors

      if (!content) {
        throw new Error(`Content element "${contentId}" not found`)
      }

      const view = { state: event.state.context.data, event }

      _.set(content, 'previewPath', Mustache.render(content.previewText, view))

      const text = _.get(content.formData, 'text')
      const variations = _.get(content.formData, 'variations')

      const message = _.sample([text, ...(variations || [])])
      if (message) {
        _.set(content, 'formData.text', Mustache.render(message, view))
      }
      renderedElements = await this.cms.renderElement(content.contentType, { ...content.formData, ...args }, channel)
    } else {
      renderedElements = await this.cms.renderElement(contentId, args, channel)
    }

    if (!_.isArray(renderedElements)) {
      renderedElements = [renderedElements]
    }

    await converseEvents.emit('rendered', {
      target: event.target,
      response: renderedElements,
      state: event.state,
      nlu: 'todo' // TODO: Dont know from where we should get the output
    })

    for (const element of renderedElements) {
      const event = Event({
        direction: 'outgoing',
        payload: element,
        type: _.get(element, 'type', 'default'),
        botId,
        channel,
        target,
        threadId
      })

      await this.eventEngine.sendEvent(event)
    }
  }
}
