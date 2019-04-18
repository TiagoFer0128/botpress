const axios = require('axios')
/**
 * @hidden true
 */

const callApi = async (url, method, body, memory, variable, headers) => {
  try {
    const response = await axios({
      method,
      url,
      headers,
      data: body
    })

    event.state[memory][variable] = { body: response.data, status: response.status }
    event.state.temp.valid = 'true'
  } catch (error) {
    const errorCode = (error.response && error.response.status) || error.code || ''
    bp.logger.error(`Error: ${errorCode} while calling resource "${url}"`)

    event.state[memory][variable] = { status: errorCode }
    event.state.temp.valid = 'false'
  }
}

return callApi(args.url, args.method, args.body, args.memory, args.variable, args.headers)
