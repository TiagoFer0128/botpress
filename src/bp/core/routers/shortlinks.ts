import { Logger } from 'botpress/sdk'
import { Router } from 'express'
import qs from 'querystring'

import { CustomRouter } from '.'

export class ShortLinksRouter implements CustomRouter {
  public readonly router: Router
  private shortlinks: Map<string, string>

  constructor(private logger: Logger) {
    this.shortlinks = new Map<string, string>()
    this.router = Router({ mergeParams: true })
    this.setupRoutes()
  }

  private setupRoutes(): void {
    this.router.get('/:name', async (req, res) => {
      const name = req.params.name
      let link = name && this.shortlinks.get(name)

      if (!link) {
        return res.status(404).send(`Shortlink "${name}" not registered`)
      }

      const query = qs.stringify(req.query)
      if (query) {
        const hasQuery = /\?/g.test(link)
        link = link.concat(`${hasQuery ? '&' : '?'}${query}`)
      }

      res.redirect(link)
    })
  }

  createShortLink(name: string, destination: string, params?: any) {
    name = name.toLocaleLowerCase()

    if (this.shortlinks.has(name)) {
      this.logger.warn(`A shortlink named "${name}" already exists.`)
    }

    const query = params ? `?${qs.stringify(params)}` : ''
    this.shortlinks.set(name, `${destination}${query}`)
  }

  deleteShortLink(name: string) {
    this.shortlinks.delete(name)
  }
}
