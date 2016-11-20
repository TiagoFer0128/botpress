import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import Promise from 'bluebird'
import _ from 'lodash'

import  { print, isDeveloping } from './util'



module.exports = (bp) => {

  const log = (level, ...args) => {
    if (bp && bp.logger[level]) {
      bp.logger[level].apply(this, args)
    } else {
      print.apply(this, [level, ...args])
    }
  }

  const listAllModules = () => {

    const installed = listInstalledModules()
    return [
      {
        name: 'messenger',
        stars: 5000,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Official Facebook Messenger module for botpress',
        downloads: 3000,
        installed: _.some(installed, m => m === 'botpress-messenger'),
        license: 'AGPL-3',
        author: 'Sylvain Perron and Dany Fortin-Simard'
      },
      {
        name: 'analytics',
        stars: 32342,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        downloads: 45006,
        installed: _.some(installed, m => m === 'botpress-analytics'),
        license: 'Proprietery',
        author: 'Dany Fortin-Simard'
      },
      {
        name: 'rivescript',
        stars: 24,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        downloads: 3000,
        installed: _.some(installed, m => m === 'botpress-rivescript'),
        license: 'AGPL-3',
        author: 'Sylvain Perron'
      }
    ]
  }

  const listPopularModules = () => {
    return [
      {
        name: 'Messenger',
        stars: 5000,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Official Facebook Messenger module for botpress',
        downloads: 3000,
        installed: true,
        license: 'AGPL-3',
        author: 'Sylvain Perron and Dany Fortin-Simard'
      },
      {
        name: 'Analytics',
        stars: 32342,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        downloads: 45006,
        installed: false,
        license: 'Proprietery',
        author: 'Dany Fortin-Simard'
      }
    ]
  }

  const listFeaturedModules = () => {
    return [
      {
        name: 'Broadcast',
        stars: 432,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Official Broadcast module for botpress',
        downloads: 3000,
        installed: false,
        license: 'AGPL-3',
        author: 'Sylvain Perron and Dany Fortin-Simard'
      },
      {
        name: 'RiveScript',
        stars: 24,
        docLink: 'http://www.github.com/botpress/botpress-messenger',
        icon: 'message',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        downloads: 3000,
        installed: true,
        license: 'AGPL-3',
        author: 'Sylvain Perron'
      }
    ]
  }

  const getInformation = () => {
    return {
      name: "The master of all chatbots",
      version: "1.3.4",
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      author: 'Dany Fortin-Simard',
      license: 'AGPL-3'
    }
  }

  const getContributor = () => {
    return {
      message: "Thanks to <strong>Sylvain Perron</strong> for his contribution on <strong>botpress-messenger</strong>!",
      img: "https://avatars.githubusercontent.com/u/1315508?v=3"
    }
  }

  const licensesPath = path.join(__dirname, '../licenses')

  const getPackageJSON = () => {
    let projectLocation = (bp && bp.projectLocation) || './'
    let packagePath = path.resolve(projectLocation, './package.json')

    if (!fs.existsSync(packagePath)) {
      log('warn', 'Could not find bot\'s package.json file')
      return []
    }

    return JSON.parse(fs.readFileSync(packagePath))
  }

  const getLicenses = () => {
    const actualLicense = getPackageJSON().license

    const licensesPath = path.join(__dirname, '../licenses')
    const licenseAGPL = fs.readFileSync(path.join(licensesPath, 'LICENSE_AGPL3')).toString()
    const licenseBotpress = fs.readFileSync(path.join(licensesPath, 'LICENSE_BOTPRESS')).toString()

    return {
      agpl: {
        name: 'AGPL-3.0',
        licensedUnder: actualLicense === 'AGPL-3.0',
        text: licenseAGPL
      },
      botpress: {
        name: 'Botpress',
        licensedUnder: actualLicense === 'Botpress',
        text: licenseBotpress
      }
    }
  }

  const changeLicense = Promise.method((license) => {
    const newLicenseFile = (license === 'agpl') ? 'LICENSE_AGPL3' : 'LICENSE_BOTPRESS'

    console.log(newLicenseFile)
  })

  const resolveModuleNames = (names) => {
    return names.map(name => {
      if (!name || typeof(name) !== 'string') {
        throw new TypeError('Expected module name to be a string')
      }

      let basename = path.basename(name)
      let prefix = ''

      if (basename !== name) {
        prefix = name.substr(0, name.length - basename.length)
      }

      if (basename.replace(/botpress-?/i, '').length === 0) {
        throw new Error('Invalid module name: ' + basename)
      }

      if (!/^botpress-/i.test(basename)) {
        basename = 'botpress-' + basename
      }

      return prefix + basename
    })
  }

  const runSpawn = (command) => {
    return new Promise((resolve, reject) => {
      command.stdout.on('data', (data) => {
        log('info', data.toString())
      })

      command.stderr.on('data', (data) => {
        log('error', data.toString())
      })

      command.on('close', (code) => {
        if (code > 0) {
          reject()
        } else {
          resolve()
        }
      })
    })
  }

  const installModules = Promise.method((...names) => {
    let modules = resolveModuleNames(names)

    const install = spawn('npm', ['install', '--save', ...modules], {
      cwd: bp && bp.projectLocation
    })

    log('info', 'Installing modules: ' + modules.join(', '))

    return runSpawn(install)
    .then(() => log('success', 'Modules successfully installed'))
    .catch(err => {
      log('error', 'An error occured during modules installation.')
      throw err
    })
  })

  const uninstallModules = Promise.method((...names) => {
    let modules = resolveModuleNames(names)

    const uninstall = spawn('npm', ['uninstall', '--save', ...modules], {
      cwd: bp && bp.projectLocation
    })

    log('info', 'Uninstalling modules: ' + modules.join(', '))

    return runSpawn(uninstall)
    .then(() => log('success', 'Modules successfully removed'))
    .catch(err => {
      log('error', 'An error occured during modules removal.')
      throw err
    })
  })

  const listInstalledModules = () => {
    const prodDeps = _.keys(getPackageJSON().dependencies)

    return _.filter(prodDeps, dep => /botpress-.+/i.test(dep))
  }

  return {
    getInstalled: listInstalledModules,
    get: listAllModules,
    getPopular: listPopularModules,
    getFeatured: listFeaturedModules,
    getInformation: getInformation,
    getLicenses: getLicenses,
    changeLicense: changeLicense,
    getContributor: getContributor,
    install: installModules,
    uninstall: uninstallModules
  }
}
