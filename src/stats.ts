import express, { Router, RequestHandler } from 'express'
import { AppContext } from './config'
import { sql } from 'kysely'

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

// Types for stats response
interface LangCount {
  lang: string | null;
  count: number;
}

interface StatsResponse {
  timestamp: string;
  postCount: number;
  uniqueUsers: number;
  firstDate: string;
  lastDate: string;
  langCounts: LangCount[];
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

      const uniqueUsers = await db
        .selectFrom('post')
        .select(
          sql<number>`count(distinct substr(uri, 1, instr(substr(uri, 6), '/') + 5))`.as('count')
        )
        .executeTakeFirstOrThrow()

      const firstPost = await db
        .selectFrom('post')
        .select(db.fn.min('indexedAt').as('min'))
        .executeTakeFirstOrThrow()

      const lastPost = await db
        .selectFrom('post')
        .select(db.fn.max('indexedAt').as('max'))
        .executeTakeFirstOrThrow()

      // Number of posts by language, handling null values and sorting by count
      const langCounts = await db
        .selectFrom('post')
        .select([
          'lang',
          db.fn.count('uri').as('count')
        ])
        .groupBy('lang')
        .orderBy('count', 'desc')
        .execute()

      const response: StatsResponse = {
        timestamp: new Date().toISOString(),
        postCount: Number(postCount.count) || 0,
        uniqueUsers: Number(uniqueUsers.count) || 0,
        firstDate: firstPost.min ? new Date(firstPost.min).toISOString() : 'None',
        lastDate: lastPost.max ? new Date(lastPost.max).toISOString() : 'None',
        langCounts: langCounts.map(count => ({
          lang: count.lang || 'unknown',
          count: Number(count.count)
        })),
      }

      res.json(response)
    } catch (error) {
      console.error('Error fetching stats:', error)
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