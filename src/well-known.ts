import express, { Router, RequestHandler } from 'express'
import { AppContext } from './config'

export const makeRouter = (ctx: AppContext): Router => {
  const router = express.Router()

  const didJsonHandler: RequestHandler = (_req, res) => {
    if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
      res.sendStatus(404)
      return
    }
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: ctx.cfg.serviceDid,
      service: [
        {
          id: '#bsky_fg',
          type: 'BskyFeedGenerator',
          serviceEndpoint: `https://${ctx.cfg.hostname}`,
        },
      ],
    })
  }

  router.get('/.well-known/did.json', didJsonHandler)

  return router
}

export default makeRouter