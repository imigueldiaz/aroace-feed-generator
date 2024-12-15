import http from 'http'
import events from 'events'
import express from 'express'
import { DidResolver, MemoryCache } from '@atproto/identity'
import { createServer } from './lexicon'
import feedGeneration from './methods/feed-generation'
import describeGenerator from './methods/describe-generator'
import { createDb, Database, migrateToLatest } from './db'
import { FirehoseSubscription } from './subscription'
import { AppContext, Config } from './config'
import wellKnown from './well-known'
import { logger } from './logger'

export class FeedGenerator {
  public app: express.Application
  public server: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    cfg: Config,
  ) {
    this.app = app
    this.db = db
    this.firehose = firehose
    this.cfg = cfg
  }

  static create(cfg: Config) {
    const app = express()
    const db = createDb(cfg.sqliteLocation)
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)

    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
    }
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    app.use(server.xrpc.router)
    app.use(wellKnown(ctx))

    // Add error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Express error:', {
        error: err,
        method: req.method,
        url: req.url,
        params: req.query,
        body: req.body
      })
      next(err)
    })

    return new FeedGenerator(app, db, firehose, cfg)
  }

  async start(): Promise<http.Server> {
    try {
      await migrateToLatest(this.db)
      
      // Start server first
      logger.info(`📡 Attempting to start server on ${this.cfg.listenhost}:${this.cfg.port}...`)
      const server = this.app.listen(this.cfg.port, this.cfg.listenhost)
      this.server = server
      
      server.on('error', (error) => {
        logger.error('❌ Server error:', error)
      })
      
      await events.once(server, 'listening')
      logger.info(`✅ Server is now listening on http://${this.cfg.listenhost}:${this.cfg.port}`)
      
      // Start firehose subscription in background
      logger.info('🔄 Starting firehose subscription...')
      this.firehose.run(this.cfg.subscriptionReconnectDelay).catch((error) => {
        logger.error('❌ Firehose subscription error:', error)
      })
      
      return server
    } catch (error) {
      logger.error('❌ Failed to start server:', error)
      throw error
    }
  }
}

export default FeedGenerator