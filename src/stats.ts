import express, { Router, RequestHandler } from 'express'
import { AppContext } from './config'

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

  router.get('/stats', statsHandler)

  return router
}

export default makeRouter