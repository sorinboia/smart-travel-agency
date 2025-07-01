// Current user profile route for /auth/me

import { sanitizeUser } from '../models/user.js';

export default async function meRoutes(fastify, opts) {
  fastify.get('/me', {
    preValidation: [fastify.authenticate], // JWT verification
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' }
          }
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.sub;
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({ _id: fastify.mongo.ObjectId.createFromHexString(userId) });
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }
    reply.send({ user: sanitizeUser(user) });
  });

}