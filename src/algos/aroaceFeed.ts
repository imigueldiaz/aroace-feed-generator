import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { logger } from '../logger'
import { SkeletonFeedPost } from '../lexicon/types/app/bsky/feed/defs'

// max 15 chars
export const shortname = 'letras-olvidadas'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  logger.info('Feed request params:', {
    cursor: params.cursor,
    limit: params.limit
  })

  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit ?? 50)

  // Si hay cursor, obtenemos posts más antiguos que el cursor
  if (params.cursor) {
    try {
      const timeStr = new Date(parseInt(params.cursor, 10)).toISOString()
      logger.info('Using cursor timestamp:', timeStr)
      builder = builder.where('post.indexedAt', '<', timeStr)
    } catch (err) {
      logger.error('Error parsing cursor:', err)
      // Si el cursor es inválido, ignorarlo
    }
  }

  // Obtener el post más reciente para comparar
  const latestPost = await ctx.db
    .selectFrom('post')
    .select(['indexedAt', 'uri'])
    .orderBy('indexedAt', 'desc')
    .limit(1)
    .executeTakeFirst()

  logger.info('Latest post in database:', latestPost)

  logger.info('Executing SQL query for feed')
  const res = await builder.execute()
  logger.info(`Found ${res.length} posts in database`)

  // Log detailed information about all posts
  res.forEach((post, index) => {
    logger.info(`Post ${index + 1}:`, {
      uri: post.uri,
      cid: post.cid,
      text: post.text?.substring(0, 50) + '...', // Solo los primeros 50 caracteres
      lang: post.lang,
      indexedAt: post.indexedAt,
      timeDiff: latestPost ? new Date(latestPost.indexedAt).getTime() - new Date(post.indexedAt).getTime() : 0
    })
  })

  const feed = res.map((row): SkeletonFeedPost => {
    const post = {
      post: row.uri,
      $type: 'app.bsky.feed.defs#skeletonFeedPost'
    }
    return post
  })

  let cursor: string | undefined
  const last = res.at(-1)
  if (last) {
    cursor = new Date(last.indexedAt).getTime().toString()
    logger.info('New cursor will be:', {
      timestamp: cursor,
      date: new Date(parseInt(cursor)).toISOString()
    })
  }

  logger.info('Final feed response:', {
    cursor,
    feedLength: feed.length,
    oldestPost: last ? {
      uri: last.uri,
      indexedAt: last.indexedAt
    } : null,
    newestPost: res[0] ? {
      uri: res[0].uri,
      indexedAt: res[0].indexedAt
    } : null
  })

  return {
    cursor,
    feed,
  }
}
