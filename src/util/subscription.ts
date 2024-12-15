import { Subscription } from '@atproto/xrpc-server'
import { cborToLexRecord, readCar } from '@atproto/repo'
import { BlobRef } from '@atproto/lexicon'
import { ids, lexicons } from '../lexicon/lexicons'
import { Record as PostRecord } from '../lexicon/types/app/bsky/feed/post'
import { Record as RepostRecord } from '../lexicon/types/app/bsky/feed/repost'
import { Record as LikeRecord } from '../lexicon/types/app/bsky/feed/like'
import { Record as FollowRecord } from '../lexicon/types/app/bsky/graph/follow'
import {
  Commit,
  OutputSchema as RepoEvent,
  isCommit,
} from '../lexicon/types/com/atproto/sync/subscribeRepos'
import { Database } from '../db'
import { logger } from '../logger'

export abstract class FirehoseSubscriptionBase {
  public sub: Subscription<RepoEvent>
  private subscribed: boolean = false

  constructor(public db: Database, public service: string) {
    this.sub = new Subscription({
      service: service,
      method: ids.ComAtprotoSyncSubscribeRepos,
      getParams: () => this.getCursor(),
      validate: (value: unknown) => {
        try {
          return lexicons.assertValidXrpcMessage<RepoEvent>(
            ids.ComAtprotoSyncSubscribeRepos,
            value,
          )
        } catch (err) {
          logger.error('repo subscription skipped invalid message', err)
        }
      },
    })
  }

  abstract handleEvent(evt: RepoEvent): Promise<void>

  async run(subscriptionReconnectDelay: number): Promise<void> {
    try {
      logger.info('🚀 Starting firehose subscription...')
      for await (const evt of this.sub) {
        if (!this.subscribed) {
          logger.info('🔥 Firehose subscription established')
          this.subscribed = true
        }
        
        try {
          await this.handleEvent(evt)
        } catch (err) {
          logger.error('❌ Error handling firehose message:', err)
        }

        // update stored cursor every 20 events or so
        if (isCommit(evt) && evt.seq % 20 === 0) {
          await this.updateCursor(evt.seq)
        }
      }
    } catch (err) {
      logger.error('❌ Firehose subscription error:', err)
      this.subscribed = false
      logger.info(`🔄 Reconnecting in ${subscriptionReconnectDelay}ms...`)
      setTimeout(() => this.run(subscriptionReconnectDelay), subscriptionReconnectDelay)
    }
  }

  async getCursor(): Promise<{ cursor?: number }> {
    const cursor = await this.db
      .selectFrom('sub_state')
      .select('cursor')
      .where('service', '=', this.service)
      .executeTakeFirst()
    return cursor ? { cursor: cursor.cursor } : {}
  }

  async updateCursor(cursor: number): Promise<void> {
    await this.db
      .insertInto('sub_state')
      .values({
        service: this.service,
        cursor,
      })
      .onConflict((oc) => oc.doUpdateSet({ cursor }))
      .execute()
  }

  async getOpsByType(evt: Commit): Promise<OperationsByType> {
    const car = await readCar(evt.blocks)
    const ops: OperationsByType = {
      posts: { creates: [], deletes: [] },
      reposts: { creates: [], deletes: [] },
      likes: { creates: [], deletes: [] },
      follows: { creates: [], deletes: [] },
    }

    for (const op of evt.ops) {
      const uri = `at://${evt.repo}/${op.path}`

      if (op.action === 'create') {
        if (!op.cid) continue
        const blockBytes = car.blocks.get(op.cid as any)
        if (!blockBytes) continue
        const record = await cborToLexRecord(blockBytes)
        const cidStr = op.cid.toString()
        if (isPost(record)) {
          ops.posts.creates.push({ uri, cid: cidStr, author: evt.repo, record })
        } else if (isRepost(record)) {
          ops.reposts.creates.push({ uri, cid: cidStr, author: evt.repo, record })
        } else if (isLike(record)) {
          ops.likes.creates.push({ uri, cid: cidStr, author: evt.repo, record })
        } else if (isFollow(record)) {
          ops.follows.creates.push({ uri, cid: cidStr, author: evt.repo, record })
        }
      } else if (op.action === 'delete') {
        if (op.path.startsWith('app.bsky.feed.post/')) {
          ops.posts.deletes.push({ uri })
        } else if (op.path.startsWith('app.bsky.feed.repost/')) {
          ops.reposts.deletes.push({ uri })
        } else if (op.path.startsWith('app.bsky.feed.like/')) {
          ops.likes.deletes.push({ uri })
        } else if (op.path.startsWith('app.bsky.graph.follow/')) {
          ops.follows.deletes.push({ uri })
        }
      }
    }

    return ops
  }
}

type OperationsByType = {
  posts: Operations<PostRecord>
  reposts: Operations<RepostRecord>
  likes: Operations<LikeRecord>
  follows: Operations<FollowRecord>
}

type Operations<T = Record<string, unknown>> = {
  creates: CreateOp<T>[]
  deletes: DeleteOp[]
}

type CreateOp<T> = {
  uri: string
  cid: string
  author: string
  record: T
}

type DeleteOp = {
  uri: string
}

export const isPost = (obj: unknown): obj is PostRecord => {
  return isType(obj, ids.AppBskyFeedPost)
}

export const isRepost = (obj: unknown): obj is RepostRecord => {
  return isType(obj, ids.AppBskyFeedRepost)
}

export const isLike = (obj: unknown): obj is LikeRecord => {
  return isType(obj, ids.AppBskyFeedLike)
}

export const isFollow = (obj: unknown): obj is FollowRecord => {
  return isType(obj, ids.AppBskyGraphFollow)
}

const isType = (obj: unknown, nsid: string) => {
  try {
    lexicons.assertValidRecord(nsid, fixBlobRefs(obj))
    return true
  } catch (err) {
    return false
  }
}

// @TODO right now record validation fails on BlobRefs
// simply because multiple packages have their own copy
// of the BlobRef class, causing instanceof checks to fail.
// This is a temporary solution.
const fixBlobRefs = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(fixBlobRefs)
  }
  if (obj && typeof obj === 'object') {
    if (obj.constructor.name === 'BlobRef') {
      const blob = obj as BlobRef
      return new BlobRef(blob.ref, blob.mimeType, blob.size, blob.original)
    }
    return Object.entries(obj).reduce((acc, [key, val]) => {
      return Object.assign(acc, { [key]: fixBlobRefs(val) })
    }, {} as Record<string, unknown>)
  }
  return obj
}
