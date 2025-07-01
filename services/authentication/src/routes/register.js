// Registration route for /auth/register

import { userRegisterSchema, sanitizeUser } from '../models/user.js';
import { hashPassword } from '../utils/password.js';

export default async function registerRoutes(fastify, opts) {
  fastify.post('/register', {
    schema: {
      body: userRegisterSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            token: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        409: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, fullName } = request.body;
    const users = fastify.mongo.db.collection('users');
    const normalizedEmail = email.toLowerCase();

    // Check for duplicate
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    // Hash password
    const pwdHash = await hashPassword(password);
    const now = new Date();
    const userDoc = {
      email: normalizedEmail,
      pwdHash,
      fullName,
      createdAt: now,
      status: 'active'
    };
    const result = await users.insertOne(userDoc);

    // Issue JWT
    const token = fastify.jwt.sign({
      sub: result.insertedId.toString(),
      email: normalizedEmail
    });
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    reply.code(201).send({
      user: sanitizeUser({ ...userDoc, _id: result.insertedId }),
      token,
      expiresAt
    });
  });
}