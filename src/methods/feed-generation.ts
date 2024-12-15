import { Server } from '../lexicon'
import { AppContext } from '../config'
import algos from '../algos'
import { AtUri } from '@atproto/syntax'
import { OutputSchema } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as FeedDefs from '../lexicon/types/app/bsky/feed/defs'
import { logger } from '../logger'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.feed.describeFeedGenerator(async () => {
    const feeds = Object.keys(algos).map((shortname) => ({
      uri: AtUri.make(
        ctx.cfg.publisherDid,
        'app.bsky.feed.generator',
        shortname,
      ).toString(),
    }))
    return {
      encoding: 'application/json' as const,
      body: {
        did: ctx.cfg.serviceDid,
        feeds,
      },
    }
  })

  server.app.bsky.feed.getFeedSkeleton(async ({ params }) => {
    try {
      logger.info(`Getting feed skeleton for feed: ${params.feed}`)
      const feedId = new AtUri(params.feed)
      logger.info(`Feed ID parsed: ${JSON.stringify(feedId)}`)
      
      const algo = algos[feedId.rkey]
      if (!algo) {
        logger.warn(`No algorithm found for feed: ${feedId.rkey}`)
        return {
          encoding: 'application/json' as const,
          body: {
            feed: [] as FeedDefs.SkeletonFeedPost[]
          }
        }
      }
      
      logger.info(`Executing algorithm for feed: ${feedId.rkey}`)
      const feed: OutputSchema = await algo(ctx, params)
      logger.info(`Got ${feed.feed.length} posts for feed`)
      
      // Preservar el $type en la respuesta
      const posts: FeedDefs.SkeletonFeedPost[] = feed.feed.map((item) => ({
        post: item.post,
        $type: 'app.bsky.feed.defs#skeletonFeedPost'
      }))

      const response = {
        encoding: 'application/json' as const,
        body: {
          cursor: feed.cursor,
          feed: posts
        }
      }

      logger.info(`Sending response: ${JSON.stringify(response)}`)
      return response
    } catch (error) {
      logger.error('Error in getFeedSkeleton:', error)
      // Log the full error details
      if (error instanceof Error) {
        logger.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      }
      throw error
    }
  })
}