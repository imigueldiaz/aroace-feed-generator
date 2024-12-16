import express, { Router, RequestHandler } from 'express'
import { AppContext } from './config'

// Middleware to check API key
const checkApiKey = (ctx: AppContext): RequestHandler => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key']
    
    if (!ctx.cfg.statsApiKey) {
      // If no API key is configured, allow access
      next()
      return
    }

    if (!apiKey || apiKey !== ctx.cfg.statsApiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key'
      })
      return
    }

    next()
  }
}

export const makeRouter = (ctx: AppContext): Router => {
  const router = express.Router()

  const statsHandler: RequestHandler = async (_req, res) => {
    if (!ctx.cfg.sqliteLocation) {
      res.sendStatus(404)
      return
    }

    const db = ctx.db

    try {
      const postCount = await db
        .selectFrom('post')
        .select(db.fn.count('uri').as('count'))
        .executeTakeFirstOrThrow()

      // max date on db
      const lastPost = await db
        .selectFrom('post')
        .select(db.fn.max('indexedAt').as('max'))
        .executeTakeFirstOrThrow()

      res.json({
        timestamp: new Date().toISOString(),
        postCount: postCount.count || 0,
        lastDate: lastPost.max ? new Date(lastPost.max).toISOString() : 'None',
      })
    } catch (error) {
      res.status(500).json({
        error: 'Error fetching post count',
        timestamp: new Date().toISOString(),
        postCount: 0,
      })
    }
  }

  // Apply API key middleware before the stats handler
  router.get('/stats', checkApiKey(ctx), statsHandler)

  return router
}

export default makeRouter