import _ from 'lodash'

const ALL_SLOTS_REGEX = /\[(.+?)\]\(([\w_\. :-]+)\)/gi

interface ParsedSlot {
  name: string
  value: string
  rawPosition: {
    start: number
    end: number
  }
  cleanPosition: {
    start: number
    end: number
  }
}

export interface ParsedUtterance {
  utterance: string
  parsedSlots: ParsedSlot[]
}

export const extractSlots = (utterance: string): RegExpExecArray[] => {
  const slotMatches: RegExpExecArray[] = []
  let matches: RegExpExecArray | null
  while ((matches = ALL_SLOTS_REGEX.exec(utterance)) !== null) {
    slotMatches.push(matches)
  }

  return slotMatches
}

export const parseUtterance = (utterance: string): ParsedUtterance => {
  let cursor = 0
  const slotMatches = extractSlots(utterance)

  const parsed = slotMatches.reduce(
    (acc, { 0: fullMatch, 1: value, 2: name, index }) => {
      const clean = acc.utterance + utterance.slice(cursor, index) + value
      cursor = index + fullMatch.length
      const parsedSlot: ParsedSlot = {
        name,
        value,
        rawPosition: {
          start: index,
          end: cursor
        },
        cleanPosition: {
          start: clean.length - value.length,
          end: clean.length
        }
      }
      return {
        utterance: clean,
        parsedSlots: [...acc.parsedSlots, parsedSlot]
      }
    },
    { utterance: '', parsedSlots: [] } as ParsedUtterance
  )

  if (cursor < utterance.length) {
    parsed.utterance += utterance.slice(cursor)
  }
  return parsed
}
