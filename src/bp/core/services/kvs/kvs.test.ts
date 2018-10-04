import Database from '../../database'
import { createDatabaseSuite } from '../../database/index.tests'

import { KeyValueStore } from './kvs'

createDatabaseSuite('KVS', (database: Database) => {
  const kvs = new KeyValueStore(database)
  const BOTID = 'bot123'
  const KEY = 'key'
  const defaultValue = {
    profile: {
      firstName: 'Bob',
      lastName: 'Ross',
      address: {
        street: '123 Awesome Street',
        city: 'Awesome City'
      }
    },
    stats: {
      awesomeness: 'Chuck Norris Level'
    }
  }

  beforeEach(async () => {
    await kvs.set(BOTID, KEY, defaultValue)
  })

  describe('Get', () => {
    it('Returns undefined if key doesnt exists', async () => {
      const value = await kvs.get('', '')
      expect(value).toBeUndefined()
    })

    it('Returns value if key exists', async () => {
      const value = await kvs.get(BOTID, KEY)
      expect(value).toEqual(defaultValue)
    })

    it('Returns value at path if key exists', async () => {
      const value = await kvs.get(BOTID, KEY, 'profile.firstName')
      expect(value).toEqual('Bob')
    })
  })

  describe('Set', () => {
    it('Sets value if key doesnt exists', async () => {
      const key = 'otherKey'
      const expected = 'value'
      await kvs.set(BOTID, key, expected)

      const value = await kvs.get(BOTID, key)
      expect(expected).toEqual(value)
    })

    it('Overwrite existing keys', async () => {
      const expected = 'new value'
      await kvs.set(BOTID, KEY, expected)

      const value = await kvs.get(BOTID, KEY)
      expect(value).toEqual(expected)
    })

    it('Overwrite existing keys at path but keep existing values', async () => {
      await kvs.set(BOTID, KEY, {}, 'profile')

      const value = await kvs.get(BOTID, KEY)
      expect(value.profile).toEqual({})
      expect(value.stats).toEqual({
        awesomeness: 'Chuck Norris Level'
      })
    })

    it('Deep overwrite', async () => {
      const newValue = 'The Great Bob'
      await kvs.set(BOTID, KEY, newValue, 'profile.firstName')

      const value = await kvs.get(BOTID, KEY)
      expect(value.profile.firstName).toEqual(newValue)
      expect(value.profile.lastName).toEqual('Ross')
      expect(value.profile.address).toEqual({
        street: '123 Awesome Street',
        city: 'Awesome City'
      })
    })
  })
})
