/* global BP_EDITION */

import path from 'path'
import fs from 'fs'
import Promise from 'bluebird'
import axios from 'axios'
import ms from 'ms'
import moment from 'moment'
import _ from 'lodash'

import listeners from './listeners'
import { resolveProjectFile, isDeveloping } from './util'

const BOTPRESS_LICENSE_SERVER = 
  'https://tkm2vfnkk5.execute-api.us-east-1.amazonaws.com/prod/botpress-api-dev-checkLicense'

const GRACE_PERIOD = 72

module.exports = ({ logger, version, projectLocation, db, botfile }) => {

  const licensesPath = path.join(__dirname, '../licenses')

  const getLicenses = () => {
    const packageJsonPath = resolveProjectFile('package.json', projectLocation, true)
    const { license } = JSON.parse(fs.readFileSync(packageJsonPath))

    const agplContent = fs.readFileSync(path.join(licensesPath, 'LICENSE_AGPL3')).toString()
    const botpressContent = fs.readFileSync(path.join(licensesPath, 'LICENSE_BOTPRESS')).toString()

    return {
      agpl: {
        name: 'AGPL-3.0',
        licensedUnder: license === 'AGPL-3.0',
        text: agplContent
      },
      botpress: {
        name: 'Botpress',
        licensedUnder: license === 'Botpress',
        text: botpressContent
      }
    }
  }

  const changeLicense = Promise.method((license) => {
    const packageJsonPath = resolveProjectFile('package.json', projectLocation, true)

    const licensePath = resolveProjectFile('LICENSE', projectLocation, true)
    const licenseFileName = (license === 'AGPL-3.0') ? 'LICENSE_AGPL3' : 'LICENSE_BOTPRESS'
    const licenseContent = fs.readFileSync(path.join(licensesPath, licenseFileName))

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath))
    pkg.license = license

    fs.writeFileSync(licensePath, licenseContent)
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2))
  })

  const middleware = listeners.hear(/^BOT_LICENSE$/, (event, next) => {
    const packageJsonPath = resolveProjectFile('package.json', projectLocation, true)
    const { license, name, author } = JSON.parse(fs.readFileSync(packageJsonPath))
    const bp = event.bp

    const response = `Bot:  ${name}
Created by: ${author}
License: ${license}
Botpress: ${bp.version}`

    const userId = event.user && event.user.id

    if (bp[event.platform] && bp[event.platform].sendText) {
      bp[event.platform].sendText(userId, response)
    } else {
      bp.middlewares.sendOutgoing({
        platform: event.platform,
        type: 'text',
        text: response,
        raw: {
          to: userId,
          message: response,
          responseTo: event
        }
      })
    }
  })

  let license = null

  const lastCheckStatus = () => {
    return db.kvs.get('__bp_license')
  }

  const setLastStatus = status => {
    return db.kvs.set('__bp_license', Object.assign({}, status, {
      ts: new Date()
    }))
  }

  const getUsers = async () => {
    const knex = await db.get()

    return knex('users')
      .select(knex.raw('count(*) as count'))
      .then().get(0).then(obj => obj && obj.count) || 0
  }

  const updateLicense = async () => {
    const users = await getUsers()
    const { customerId, licenseKey } = botfile
    const verificationMethod = 'cid_token'

    return axios.post(BOTPRESS_LICENSE_SERVER, {
      method: verificationMethod,
      customerId,
      licenseKey,
      users,
      edition: BP_EDITION
    })
    .then(({ data }) => {
      logger.info('>>>> LICENSE CHECK', data)

      if (data && data.success) {
        setLastStatus(data)
      }
    })
  }

  setInterval(() => updateLicense(), ms('1 hours'))
  updateLicense() // Check license on boot

  const dealExpired = lastCheck => {
    if (isDeveloping) {
      return
    }

    if (lastCheck && lastCheck.ts) {
      const since = moment().diff(lastCheck.ts, 'hours')

      if (since >= 1) {
        updateLicense()
      }

      if (since > 3 && since < GRACE_PERIOD) {
        logger.warn(`License was not verified since ${since} hours.`)
        logger.warn('Botpress will turn unlicensed in ' + (GRACE_PERIOD - since) + ' hours')
      }

      if (since >= GRACE_PERIOD) {
        logger.error("Botpress is now unlicensed and will not function properly.")
        logger.error("Please get a license and/or contact support@botpress.io")
        setTimeout(() => process.exit(), 5000)
      }
    }
  }

  const getLicensing = async function() {
    const lastCheck = await lastCheckStatus()
    dealExpired(lastCheck)
    
    const licenses = getLicenses()
    let currentLicense = _.find(licenses, { licensedUnder: true })
    currentLicense = currentLicense || licenses.agpl

    const result = {
      licensed: lastCheck.licensed,
      name: 'Botpress ' + BP_EDITION,
      text: currentLicense.text,
      status: lastCheck.status
    }

    if (lastCheck.limit && lastCheck.limit.message) {
      result.limit = lastCheck.limit
    }

    return result
  }

  return {
    getLicensing,
    getLicenses,
    changeLicense,
    middleware
  }
}
