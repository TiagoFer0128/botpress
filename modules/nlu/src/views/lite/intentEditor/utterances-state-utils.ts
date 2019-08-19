import _ from 'lodash'
import { NodeJSON, Value, ValueJSON } from 'slate'

// TODO add typings for this

const ALL_SLOTS_REGEX = /\[(.+?)\]\(([\w_\.-]+)\)/gi

// exported for testing purposes
export const extractSlots = (utterance: string): RegExpExecArray[] => {
  const slotMatches: RegExpExecArray[] = []
  let matches: RegExpExecArray | null
  while ((matches = ALL_SLOTS_REGEX.exec(utterance)) !== null) {
    slotMatches.push(matches)
  }

  return slotMatches
}

const textNodeFromText = (text: string, from: number, to: number | undefined = undefined) => ({
  object: 'text',
  text: text.slice(from, to),
  marks: []
})

const textNodeFromSlotMatch = (match: RegExpExecArray) => ({
  object: 'text',
  text: match[1],
  marks: [
    {
      object: 'mark',
      type: 'slot',
      data: { slotName: match[2] }
    }
  ]
})

export const textNodesFromUtterance = (utterance: string) => {
  const slotMatches = extractSlots(utterance)
  let cursor = 0

  const nodes = _.chain(slotMatches)
    .flatMap(match => {
      const parts = [textNodeFromText(utterance, cursor, match.index), textNodeFromSlotMatch(match)]
      cursor = match.index + match[0].length // index is stateful since its a general regex
      return parts
    })
    .filter(node => node.text !== '')
    .value()

  if (cursor < utterance.length || !utterance.length) {
    nodes.push(textNodeFromText(utterance, cursor))
  }

  return nodes
}

export const utterancesToValue = (utterances: string[], selection = undefined) => {
  const summary = utterances[0] || ''
  const rest = utterances.length > 1 ? utterances.slice(1) : ['']

  const value: ValueJSON = {
    object: 'value',
    document: {
      object: 'document',
      nodes: [
        {
          object: 'block',
          type: 'title',
          data: {},
          nodes: textNodesFromUtterance(summary)
        },
        ...rest.map(text => ({
          object: 'block',
          type: 'paragraph',
          data: {},
          nodes: textNodesFromUtterance(text)
        }))
      ] as NodeJSON[]
    }
  }
  if (selection) {
    value['selection'] = selection
  }
  return Value.fromJS(value)
}

export const valueToUtterances = value => {
  return value
    .getIn(['document', 'nodes'])
    .map(block =>
      block.nodes.reduce((utt, node) => {
        const value = node.get('text')
        if (node.marks.size > 0) {
          const slot = node.marks.first().data.get('slotName')
          return `${utt}[${value}](${slot})`
        }

        return `${utt}${value}`
      }, '')
    )
    .filter(_.identity)
    .toJS()
}

export const removeSlotFromUtterances = (utterances: string[], slotName: string) => {
  const regex = new RegExp(`\\[([^\\[\\]\\(\\)]+?)\\]\\(${slotName}\\)`, 'gi')

  return utterances.map(u => u.replace(regex, '$1'))
}

export const renameSlotInUtterances = (utterances: string[], prevSlotName: string, newSlotName: string) => {
  const regex = new RegExp(`\\[([^\\(\\)\\[\\]]+?)\\]\\(${prevSlotName}\\)`, 'gi')

  return utterances.map(u => u.replace(regex, `[$1](${newSlotName})`))
}
