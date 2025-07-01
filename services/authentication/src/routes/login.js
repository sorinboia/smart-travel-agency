// Login route for /auth/login

import { userLoginSchema, sanitizeUser } from '../models/user.js';
import { comparePassword } from '../utils/password.js';

export default async function loginRoutes(fastify, opts) {
  fastify.post('/login', {
    schema: {
      body: userLoginSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;
    const users = fastify.mongo.db.collection('users');
    const normalizedEmail = email.toLowerCase();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const valid = await comparePassword(password, user.pwdHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const token = fastify.jwt.sign({
      sub: user._id.toString(),
      email: user.email
    });
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    reply.send({ token, expiresAt });
  });
}