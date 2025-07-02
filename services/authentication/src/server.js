// Fastify server bootstrap for STA Authentication Service

import Fastify from 'fastify';
import pino from 'pino';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';

import jwtConfig from './plugins/jwt.js';
import mongoConfig from './plugins/mongodb.js';
import authenticatePlugin from './plugins/authenticate.js';
import registerRoutes from './routes/register.js';
import loginRoutes from './routes/login.js';
import meRoutes from './routes/me.js';


const fastify = Fastify({
  logger: pino({ level: process.env.LOG_LEVEL || 'info' })
});

 // Register plugins
await fastify.register(mongoPlugin, mongoConfig);
await fastify.register(jwtPlugin, jwtConfig);
await fastify.register(authenticatePlugin);

// Ensure users index on email
fastify.after(async () => {
  const users = fastify.mongo.db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
});

// Register routes
await fastify.register(registerRoutes, { prefix: '/auth' });
await fastify.register(loginRoutes, { prefix: '/auth' });
await fastify.register(meRoutes, { prefix: '/auth' });

// Health check
fastify.get('/healthz', async (req, reply) => {
  const mongoStatus = fastify.mongo.db ? 'reachable' : 'unavailable';
  reply.send({
    status: 'ok',
    uptime: process.uptime(),
    mongo: mongoStatus
  });
});

// Start server
const port = process.env.PORT || 4003;
fastify.listen({ port, host: '0.0.0.0' })
  .then(() => {
    fastify.log.info(`Auth service listening on port ${port}`);
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });