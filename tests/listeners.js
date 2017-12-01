/* eslint-env babel-eslint, node, mocha */

const _ = require('lodash')
const Promise = require('bluebird')
const listeners = require('../src/listeners')

describe('hear', () => {
  const { hear: hearFn } = listeners

  const hearYes = condition => event =>
    Promise.fromCallback(callback => {
      hearFn(condition, () => {
        callback()
      })(event)
    }).timeout(10)

  const hearNo = condition => event =>
    Promise.fromCallback(callback => {
      hearFn(condition, () => {
        throw new Error('Expected condition not to work')
      })(event)
      setTimeout(callback, 5)
    })

  const event = {
    type: 'message',
    platform: 'facebook',
    text: 'Hello world',
    raw: {
      from: '1234567890',
      message: 'Hello world',
      user: {
        name: 'Garry',
        age: 25
      }
    }
  }

  it('condition is string', () =>
    Promise.all([hearYes('Hello world')(event), hearNo('hello world')(event), hearNo('banana')(event)]))

  it('condition is regex', () =>
    Promise.all([hearYes(/world/)(event), hearNo(/World/)(event), hearYes(/World/i)(event)]))

  it('condition is function', () =>
    Promise.all([
      hearYes(event => event.text === 'Hello world')(event),
      hearYes(event => event.text.indexOf('world') >= 0)(event),
      hearNo(event => event.text === 'hello, world')(event)
    ]))

  it('condition is array', () =>
    Promise.all([
      hearYes([{ text: /world/, platform: 'twitter' }, { text: /world/, type: 'message' }])(event),
      hearYes([{ text: /world/, type: 'message' }, { text: /world/, platform: 'twitter' }])(event),
      hearNo([{ text: /banana/, type: 'message' }, { text: /world/, platform: 'twitter' }])(event),
      hearYes([t => t === 'Hello world', 'world'])(event),
      hearNo([{ text: /banana/, type: 'message' }, /hello/])(event)
    ]))

  it('Many conditions', () =>
    Promise.all([
      hearYes({ text: /world/, type: 'message' })(event),
      hearNo({ text: /world/, platform: 'twitter' })(event),
      hearNo({ 'raw.user.age': 26 })(event)
    ]))

  it('Deep keys', () =>
    Promise.all([
      hearYes({ 'raw.user.name': 'Garry' })(event),
      hearYes({ 'raw.user.age': 25 })(event),
      hearNo({ 'raw.user.age': 26 })(event)
    ]))
})
