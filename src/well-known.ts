import { FastifyRequest, FastifyReply } from 'fastify'
import { AppContext } from './config'

export function makeRouter(ctx: AppContext) {
  return {
    didJson: async (request: FastifyRequest, reply: FastifyReply) => {
      if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
        return reply.status(404).send()
      }
      
      return reply.send({
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: ctx.cfg.serviceDid,
        service: [
          {
            id: '#aspec-community-feed',
            type: 'BskyFeedGenerator',
            serviceEndpoint: `https://${ctx.cfg.hostname}`,
          },
        ],
      })
    }
  }
}