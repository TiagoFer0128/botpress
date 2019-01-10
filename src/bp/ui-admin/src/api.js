import Promise from 'bluebird'
import axios from 'axios'
import _ from 'lodash'
import { pullToken, logout } from './Auth'
import * as licensing from './Auth/licensing'
import { toast } from 'react-toastify'

const defaultOptions = {
  timeout: 2000
}

const createClient = (clientOptions, { toastErrors, addInterceptor }) => {
  const client = axios.create({
    ...defaultOptions,
    ...clientOptions
  })

  client.interceptors.response.use(
    response => response,
    error => {
      const wrappedError = _.get(error, 'response.data')
      const errorCode = _.get(wrappedError, 'errorCode')
      if (errorCode) {
        if (errorCode === 'BP_0005') {
          return logout()
        }
        return Promise.reject(wrappedError)
      } else {
        return Promise.reject(error)
      }
    }
  )

  if (toastErrors) {
    client.interceptors.response.use(
      response => response,
      error => {
        const wrappedMessage = _.get(error, 'response.data.message')
        if (wrappedMessage) {
          showToast(wrappedMessage)
        } else if (error.message) {
          showToast(error.message)
        } else {
          showToast('Something wrong happened. Please try again later.')
        }

        return Promise.reject(error)
      }
    )
  }
  return client
}

const showToast = message => {
  toast.error(message, {
    position: toast.POSITION.TOP_RIGHT
  })
}

const overrideApiUrl = process.env.REACT_APP_API_URL
  ? { baseURL: `${process.env.REACT_APP_API_URL}/api/v1` }
  : { baseURL: `/api/v1` }

const overrideLicensingServer = process.env.REACT_APP_LICENSING_SERVER
  ? { baseURL: `${process.env.REACT_APP_LICENSING_SERVER}` }
  : { baseURL: `https://license.botpress.io` }

const overrideStripePath = process.env.REACT_APP_STRIPE_PATH
  ? `${process.env.REACT_APP_STRIPE_PATH}`
  : `https://botpress.io/stripe`

export default {
  getSecured({ token, toastErrors = true } = {}) {
    if (!token) {
      const ls = pullToken()
      token = ls && ls.token
    }

    return createClient(
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        ...overrideApiUrl
      },
      { toastErrors }
    )
  },

  getAnonymous({ toastErrors = true } = {}) {
    return createClient(overrideApiUrl, { toastErrors })
  },

  getLicensing({ toastErrors = true } = {}) {
    const client = createClient(
      {
        timeout: 5000,
        headers: {
          'X-AUTH-TOKEN': `bearer ${licensing.getToken()}`
        },
        ...overrideLicensingServer
      },
      { toastErrors }
    )

    client.interceptors.response.use(
      response => response,
      error => {
        if (error.response.status === 401) {
          licensing.logout()
        }

        throw error
      }
    )

    return client
  },

  getStripePath() {
    return overrideStripePath
  }
}
