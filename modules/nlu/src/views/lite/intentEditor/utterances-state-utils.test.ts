import { Value } from 'slate'

import {
  extractSlots,
  removeSlotFromUtterances,
  renameSlotInUtterances,
  textNodesFromUtterance,
  utterancesToValue,
  valueToUtterances
} from './utterances-state-utils'

const mockedSlateValue = {
  object: 'value',
  document: {
    object: 'document',
    data: {},
    nodes: [
      {
        object: 'block',
        type: 'title',
        data: {},
        nodes: [
          {
            object: 'text',
            text: 'Book flight to ',
            marks: []
          },
          {
            object: 'text',
            text: 'Paris',
            marks: [
              {
                object: 'mark',
                type: 'slot',
                data: { slotName: 'destination' }
              }
            ]
          }
        ]
      },
      {
        object: 'block',
        type: 'paragraph',
        data: {},
        nodes: [
          {
            object: 'text',
            text: 'Fly me somewhere',
            marks: []
          }
        ]
      }
    ]
  }
}

test('extract slots from utterance', () => {
  const extracted = extractSlots('My name is [Kanye](me) and your name is [Jay](you)')
  expect(extracted.length).toEqual(2)
  expect(extracted[0][0]).toEqual('[Kanye](me)')
  expect(extracted[0][1]).toEqual('Kanye')
  expect(extracted[0][2]).toEqual('me')
  expect(extracted[0].index).toEqual(11)
  expect(extracted[1][0]).toEqual('[Jay](you)')
  expect(extracted[1][1]).toEqual('Jay')
  expect(extracted[1][2]).toEqual('you')
  expect(extracted[1].index).toEqual(40)
})

describe('Slate nodes from utterance', () => {
  test('No slots', () => {
    const nodes = textNodesFromUtterance('My name is')
    expect(nodes.length).toEqual(1)
    expect(nodes[0].text).toEqual('My name is')
  })
  test('Only slot', () => {
    const nodes = textNodesFromUtterance('[Heizenberg](me)')
    expect(nodes.length).toEqual(1)
    expect(nodes[0].text).toEqual('Heizenberg')
    expect(nodes[0].marks[0].data.slotName).toEqual('me')
  })
  test('Slot begin', () => {
    const nodes = textNodesFromUtterance('[Heizenberg](me) is my name')
    expect(nodes.length).toEqual(2)
    expect(nodes[0].text).toEqual('Heizenberg')
    expect(nodes[0].marks[0].data.slotName).toEqual('me')
    expect(nodes[1].text).toEqual(' is my name')
    expect(nodes[1].marks.length).toEqual(0)
  })
  test('Slot middle', () => {
    const nodes = textNodesFromUtterance('My name is [Heizenberg](me) and I AM DANGER')
    expect(nodes.length).toEqual(3)
    expect(nodes[0].text).toEqual('My name is ')
    expect(nodes[0].marks.length).toEqual(0)
    expect(nodes[1].text).toEqual('Heizenberg')
    expect(nodes[1].marks[0].data.slotName).toEqual('me')
    expect(nodes[2].text).toEqual(' and I AM DANGER')
    expect(nodes[2].marks.length).toEqual(0)
  })
  test('Slot end', () => {
    const nodes = textNodesFromUtterance('My name is [Heizenberg](me)')
    expect(nodes.length).toEqual(2)
    expect(nodes[0].text).toEqual('My name is ')
    expect(nodes[0].marks.length).toEqual(0)
    expect(nodes[1].text).toEqual('Heizenberg')
    expect(nodes[1].marks[0].data.slotName).toEqual('me')
  })
  test('Slots everywhere', () => {
    const nodes = textNodesFromUtterance(
      'Just because you shot [Jesse James](target), don’t make you [Jesse James](you), man.'
    )

    expect(nodes.length).toEqual(5)
    expect(nodes[0].text).toEqual('Just because you shot ')
    expect(nodes[0].marks.length).toEqual(0)
    expect(nodes[1].text).toEqual('Jesse James')
    expect(nodes[1].marks[0].data.slotName).toEqual('target')
    expect(nodes[2].text).toEqual(', don’t make you ')
    expect(nodes[2].marks.length).toEqual(0)
    expect(nodes[3].text).toEqual('Jesse James')
    expect(nodes[3].marks[0].data.slotName).toEqual('you')
    expect(nodes[4].text).toEqual(', man.')
    expect(nodes[4].marks.length).toEqual(0)
  })
})

describe('from utterances to slate value', () => {
  test('no utterances', () => {
    const value = utterancesToValue([]).toJS()
    expect(value.document.nodes.length).toEqual(2)
    // @ts-ignore
    expect(value.document.nodes[0].type).toEqual('title')
  })

  test('1 utterance', () => {})

  test('many utterances', () => {})
})

test('from slate value to utterances', () => {
  // @ts-ignore
  const value = Value.fromJS(mockedSlateValue)

  const utterances = valueToUtterances(value)

  expect(utterances.length).toEqual(2)
  expect(utterances[0]).toEqual('Book flight to [Paris](destination)')
  expect(utterances[1]).toEqual('Fly me somewhere')
})

test('remove slot from utterances', () => {
  const utterances = [
    'My colleages call me [Mr. White](me), for my family I am [Walter](me) and my customers know me as [Heizenberg](me), who am I?',
    'Just because you shot [Jesse James](target), don’t make you [Jesse James](you), man.',
    'Boring utterance with no slots'
  ]

  const newUtterances = removeSlotFromUtterances(utterances, 'me')

  expect(newUtterances[0]).toEqual(
    'My colleages call me Mr. White, for my family I am Walter and my customers know me as Heizenberg, who am I?'
  )
  expect(newUtterances[1]).toEqual(utterances[1])
  expect(newUtterances[2]).toEqual(utterances[2])
})

test('rename slot from utterances', () => {
  const utterances = [
    'My colleages call me [Mr. White](me), for my family I am [Walter](me) and my customers know me as [Heizenberg](me), who am I?',
    'Just because you shot [Jesse James](target), don’t make you [Jesse James](you), man.',
    'Boring utterance with no slots'
  ]

  const newUtterances = renameSlotInUtterances(utterances, 'target', 'the-man')

  expect(newUtterances[0]).toEqual(utterances[0])
  expect(newUtterances[1]).toEqual(
    'Just because you shot [Jesse James](the-man), don’t make you [Jesse James](you), man.'
  )
  expect(newUtterances[2]).toEqual(utterances[2])
})
