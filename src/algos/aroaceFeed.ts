import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { logger } from '../logger'
import { SkeletonFeedPost } from '../lexicon/types/app/bsky/feed/defs'

// max 15 chars
export const shortname = 'letras-olvidadas'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit ?? 50)

  if (params.cursor) {
    const timeStr = new Date(parseInt(params.cursor, 10)).toISOString()
    builder = builder.where('post.indexedAt', '<', timeStr)
  }

  logger.info('Executing SQL query for feed')
  const res = await builder.execute()
  logger.info(`Found ${res.length} posts in database`)

  // Log detailed information about all posts
  res.forEach((post, index) => {
    logger.info(`Post ${index + 1}:`, {
      uri: post.uri,
      cid: post.cid,
      text: post.text,
      lang: post.lang,
      indexedAt: post.indexedAt
    })
  })

  const feed = res.map((row): SkeletonFeedPost => {
    const post = {
      post: row.uri,
      $type: 'app.bsky.feed.defs#skeletonFeedPost'
    }
    logger.info('Generated feed post:', post)
    return post
  })

  let cursor: string | undefined
  const last = res.at(-1)
  if (last) {
    cursor = new Date(last.indexedAt).getTime().toString()
  }

  logger.info('Final feed response:', {
    cursor,
    feedLength: feed.length,
    feed: feed
  })

  return {
    cursor,
    feed,
  }
}
