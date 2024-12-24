import dotenv from 'dotenv'
import FeedGenerator from './server'
import { logger } from './logger'
import { metricsExporter } from './metrics/exporter'

const run = async () => {
  dotenv.config()
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`
  
  logger.info('📝 Starting server with configuration:')
  logger.info(`- Hostname: ${hostname}`)
  logger.info(`- Service DID: ${serviceDid}`)
  logger.info(`- Port: ${maybeInt(process.env.FEEDGEN_PORT) ?? 3000}`)
  logger.info(`- Listen Host: ${maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost'}`)
  logger.info(`- SQLite Location: ${maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:'}`)
  logger.info(`- Stats API Key: ${process.env.STATS_API_KEY ? 'Configured' : 'Not configured'}`)
  
  const cfg = {
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
    hostname,
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid:
      maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    serviceDid,
    statsApiKey: maybeStr(process.env.STATS_API_KEY)
  }
  logger.info('🚀 Server created, attempting to start...')
  try {
    const server = FeedGenerator.create(cfg)
    await server.start()
    metricsExporter.start()
    logger.info(`🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`)
  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    throw error
  }
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

run().catch((err) => {
  logger.error('Failed to start server:', err)
  process.exit(1)
})
