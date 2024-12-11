import { FastifyInstance, FastifyServerOptions } from 'fastify'
import fastify from 'fastify'
import cors from '@fastify/cors'
import { DidResolver, MemoryCache } from '@atproto/identity'
import { createServer } from './lexicon'
import feedGeneration from './methods/feed-generation'
import describeGenerator from './methods/describe-generator'
import { createDb, Database, migrateToLatest } from './db'
import { FirehoseSubscription } from './subscription'
import { AppContext, Config } from './config'
import { makeRouter } from './well-known'

export class FeedGenerator {
  public app: FastifyInstance
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config

  constructor(
    app: FastifyInstance,
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
    const fastifyOpts: FastifyServerOptions = {
      logger: true,
      maxParamLength: 100,
      connectionTimeout: 30000,  // 30 segundos
      keepAliveTimeout: 30000,
      pluginTimeout: 10000,
    }
    
    const app = fastify(fastifyOpts)
    
    // Configurar CORS
    app.register(cors, {
      origin: true, // Permite todas los orígenes en desarrollo
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 7200, // 2 horas de cache para las opciones preflight
    })

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

    // Register routes
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    
    // Registrar el router XRPC como plugin de Fastify
    app.register(async (fastify) => {
      fastify.route({
        url: '/xrpc/*',
        method: ['GET', 'POST'],
        handler: (request, reply) => {
          server.xrpc.router(request.raw, reply.raw)
        }
      })
    })

    // Registrar well-known como plugin
    app.register(async (fastify) => {
      const wellKnownRoutes = makeRouter(ctx)
      fastify.route({
        url: '/.well-known/did.json',
        method: ['GET'],
        handler: wellKnownRoutes.didJson
      })
    })

    return new FeedGenerator(app, db, firehose, cfg)
  }

  async start(): Promise<void> {
    await migrateToLatest(this.db)
    this.firehose.run(this.cfg.subscriptionReconnectDelay)
    
    try {
      const address = await this.app.listen({
        port: this.cfg.port,
        host: this.cfg.listenhost
      })
      console.log(`Server listening at ${address}`)
    } catch (err) {
      this.app.log.error(err)
      process.exit(1)
    }
  }
}

export default FeedGenerator