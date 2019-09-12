import ReactGA from 'react-ga'
import snarkdown from 'snarkdown'

export const getOverridedComponent = (overrides, componentName) => {
  if (overrides && overrides[componentName]) {
    const { module, component } = overrides[componentName]
    if (module && component) {
      return window.botpress[module][component]
    }
  }
}

export const asyncDebounce = async timeMs => {
  let lastClickInMs = undefined

  const debounce = promise => {
    const now = Date.now()
    if (!lastClickInMs) {
      lastClickInMs = now
    }

    if (now - lastClickInMs > timeMs) {
      lastClickInMs = now
      return promise
    }
  }
}

export const downloadFile = (name, blob) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.setAttribute('download', name)

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const checkLocationOrigin = () => {
  if (!window.location.origin) {
    const { protocol, hostname, port } = window.location
    // @ts-ignore
    window.location.origin = `${protocol}//${hostname}${port && ':' + port}`
  }
}

export const initializeAnalytics = () => {
  if (window.SEND_USAGE_STATS) {
    try {
      // @ts-ignore
      ReactGA.initialize('UA-90044826-2', {
        gaOptions: {
          // @ts-ignore
          userId: window.UUID
        }
      })
      // @ts-ignore
      ReactGA.pageview(window.location.pathname + window.location.search)
    } catch (err) {
      console.log('Error init analytics', err)
    }
  }
}

export const renderUnsafeHTML = (template: string = '', escaped: boolean = false): string => {
  if (escaped) {
    template = template.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  const html = snarkdown(template)
  return html.replace(/<a href/gi, `<a target="_blank" href`)
}
