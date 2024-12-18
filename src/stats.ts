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

interface TimeDistribution {
  dayOfWeek: Record<string, number>;
  hourOfDay: Record<string, number>;
}

interface ContentMetrics {
  averageLength: number;
  hasImageCount: number;
  hasLinkCount: number;
  isReplyCount: number;
  isThreadCount: number;
}

interface StatsResponse {
  timestamp: string;
  postCount: number;
  uniqueUsers: number;
  firstDate: string;
  lastDate: string;
  langCounts: LangCount[];
  timeDistribution: TimeDistribution;
  contentMetrics: ContentMetrics;
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

      // Number of posts by language
      const langCounts = await db
        .selectFrom('post')
        .select([
          'lang',
          db.fn.count('uri').as('count')
        ])
        .groupBy('lang')
        .orderBy('count', 'desc')
        .execute()

      // Time distribution
      const timeDistribution = await db
        .selectFrom('post')
        .select([
          sql<string>`json_object(
            'dayOfWeek', json_object(
              '0', count(case when strftime('%w', indexedAt) = '0' then 1 end),
              '1', count(case when strftime('%w', indexedAt) = '1' then 1 end),
              '2', count(case when strftime('%w', indexedAt) = '2' then 1 end),
              '3', count(case when strftime('%w', indexedAt) = '3' then 1 end),
              '4', count(case when strftime('%w', indexedAt) = '4' then 1 end),
              '5', count(case when strftime('%w', indexedAt) = '5' then 1 end),
              '6', count(case when strftime('%w', indexedAt) = '6' then 1 end)
            ),
            'hourOfDay', json_object(
              '0', count(case when strftime('%H', indexedAt) = '00' then 1 end),
              '1', count(case when strftime('%H', indexedAt) = '01' then 1 end),
              '2', count(case when strftime('%H', indexedAt) = '02' then 1 end),
              '3', count(case when strftime('%H', indexedAt) = '03' then 1 end),
              '4', count(case when strftime('%H', indexedAt) = '04' then 1 end),
              '5', count(case when strftime('%H', indexedAt) = '05' then 1 end),
              '6', count(case when strftime('%H', indexedAt) = '06' then 1 end),
              '7', count(case when strftime('%H', indexedAt) = '07' then 1 end),
              '8', count(case when strftime('%H', indexedAt) = '08' then 1 end),
              '9', count(case when strftime('%H', indexedAt) = '09' then 1 end),
              '10', count(case when strftime('%H', indexedAt) = '10' then 1 end),
              '11', count(case when strftime('%H', indexedAt) = '11' then 1 end),
              '12', count(case when strftime('%H', indexedAt) = '12' then 1 end),
              '13', count(case when strftime('%H', indexedAt) = '13' then 1 end),
              '14', count(case when strftime('%H', indexedAt) = '14' then 1 end),
              '15', count(case when strftime('%H', indexedAt) = '15' then 1 end),
              '16', count(case when strftime('%H', indexedAt) = '16' then 1 end),
              '17', count(case when strftime('%H', indexedAt) = '17' then 1 end),
              '18', count(case when strftime('%H', indexedAt) = '18' then 1 end),
              '19', count(case when strftime('%H', indexedAt) = '19' then 1 end),
              '20', count(case when strftime('%H', indexedAt) = '20' then 1 end),
              '21', count(case when strftime('%H', indexedAt) = '21' then 1 end),
              '22', count(case when strftime('%H', indexedAt) = '22' then 1 end),
              '23', count(case when strftime('%H', indexedAt) = '23' then 1 end)
            )
          )`.as('distribution')
        ])
        .executeTakeFirstOrThrow()

      // Parse the JSON string from SQLite
      const parsedTimeDistribution: TimeDistribution = JSON.parse(timeDistribution.distribution);

      // Content metrics
      const contentMetrics = await db
        .selectFrom('post')
        .select([
          sql<number>`avg(length(text))`.as('averageLength'),
          sql<number>`count(case when text like '%http%' then 1 end)`.as('hasLinkCount'),
          sql<number>`count(case when uri like '%/app.bsky.feed.post/%/app.bsky.feed.post/%' then 1 end)`.as('isReplyCount')
        ])
        .executeTakeFirstOrThrow()

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
        timeDistribution: parsedTimeDistribution,
        contentMetrics: {
          averageLength: Math.round(Number(contentMetrics.averageLength) || 0),
          hasLinkCount: Number(contentMetrics.hasLinkCount) || 0,
          hasImageCount: 0,
          isReplyCount: Number(contentMetrics.isReplyCount) || 0,
          isThreadCount: 0
        }
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