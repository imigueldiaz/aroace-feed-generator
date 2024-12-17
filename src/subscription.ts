import {
  OutputSchema as RepoEvent,
  isCommit,
  Commit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase } from './util/subscription'
import dotenv from 'dotenv'
import { analyzePost } from './analyze'
import { logger} from './logger'

dotenv.config()

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) {
      return
    }

    const ops = await this.getOpsByType(evt)
    
    // Only process new posts
    if (ops.posts.creates.length === 0) {
      return
    }
    
    //logToFile.info(`Processing ${ops.posts.creates.length} new posts`)
    
    // Process only new posts
    for (const post of ops.posts.creates) {
      try {
        logger.debug('Analyzing post:', {
          uri: post.uri,
          cid: post.cid,
          text: post.record.text,
          lang: post.record.langs
        })
        
        const isValid = analyzePost(post.record)
        if (isValid) {
          logger.info('✅ Post matched:', {
            uri: post.uri,
            cid: post.cid,
            text: post.record.text,
            lang: post.record.langs
          })
          
          await this.db
            .insertInto('post')
            .values({
              uri: post.uri,
              cid: post.cid,
              text: post.record.text,
              lang: post.record.langs ? post.record.langs[0] : null,
              indexedAt: new Date().toISOString(),
            })
            .onConflict((oc) => oc.doNothing())
            .execute()
            
          logger.info('Post inserted into database')
        } else {
          logger.debug('❌ Post did not match criteria')
        }
      } catch (err) {
        logger.error('Error processing post:', {
          error: err,
          uri: post.uri,
          cid: post.cid
        })
      }
    }
  }

  async run(subscriptionReconnectDelay: number) {
    while (true) {
      try {
        logger.info('🔄 Connecting to firehose...')
        for await (const evt of this.sub) {
          await this.handleEvent(evt)
        }
      } catch (err) {
        logger.error('❌ Firehose connection error:', err)
        logger.info(`⏳ Waiting ${subscriptionReconnectDelay}ms before reconnecting...`)
        await new Promise((r) => setTimeout(r, subscriptionReconnectDelay))
        logger.info('🔄 Attempting to reconnect to firehose...')
      }
    }
  }
}
