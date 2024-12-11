import { FastifyRequest, FastifyReply } from 'fastify'
import { AppContext } from './config'

export function makeRouter(ctx: AppContext) {
  return {
    didJson: async (_request: FastifyRequest, reply: FastifyReply) => {
      const hostname = ctx.cfg.hostname || 'imigueldiaz.dev'
      const publisherDid = process.env.FEEDGEN_PUBLISHER_DID

      if (!publisherDid) {
        return reply.status(500).send({ error: 'FEEDGEN_PUBLISHER_DID not configured' })
      }

      const didDoc = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/multikey/v1',
          'https://w3id.org/security/suites/secp256k1-2019/v1'
        ],
        'id': publisherDid,
        'alsoKnownAs': [
          `at://imigueldiaz.dev`
        ],
        'verificationMethod': [{
          'id': `${publisherDid}#atproto`,
          'type': 'Multikey',
          'controller': publisherDid,
          'publicKeyMultibase': 'zQ3shjoZJRUE1GjJvWCz1b4tbn5RzeSosT99TVwkj9feFBaQ4'
        }],
        'service': [
          {
            'id': '#atproto_pds',
            'type': 'AtprotoPersonalDataServer',
            'serviceEndpoint': 'https://morel.us-east.host.bsky.network'
          },
          {
            'id': '#bsky_fg',
            'type': 'BskyFeedGenerator',
            'serviceEndpoint': `https://${hostname}`
          }
        ]
      }

      return reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .send(didDoc)
    }
  }
}