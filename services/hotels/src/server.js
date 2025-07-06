import 'dotenv/config';
// Fastify server bootstrap for STA Hotels Service

import Fastify from 'fastify';
import pino from 'pino';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';
import sensible from '@fastify/sensible';

import jwtConfig from './plugins/jwt.js';
import mongoConfig from './plugins/mongodb.js';
import minioPlugin from './plugins/minio.js';

// Placeholder for authenticatePlugin (to be implemented)
import fp from 'fastify-plugin';
const authenticatePlugin = fp(async (fastify) => {
  fastify.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

import { loadCatalogue } from './models/hotelCatalogue.js';
import searchRoutes from './routes/search.js';
import detailsRoutes from './routes/details.js';
import bookRoutes from './routes/book.js';
import listBookingsRoutes from './routes/listBookings.js';
import cancelRoutes from './routes/cancel.js';

const fastify = Fastify({
  logger: pino({ level: process.env.LOG_LEVEL || 'info' })
});

// Register plugins
await fastify.register(mongoPlugin, mongoConfig);
await fastify.register(minioPlugin);
await fastify.register(jwtPlugin, jwtConfig);
await fastify.register(sensible);
await fastify.register(authenticatePlugin);

// Load hotels.json from MinIO after plugins are registered
await fastify.after(async () => {
  await loadCatalogue(fastify);
  fastify.log.info('Hotel catalogue loaded from MinIO');
});

// Register routes
await fastify.register(searchRoutes);
await fastify.register(detailsRoutes);
await fastify.register(bookRoutes);
await fastify.register(listBookingsRoutes);
await fastify.register(cancelRoutes);

// Health check
fastify.get('/healthz', async (req, reply) => {
  // TODO: Check Mongo and MinIO reachability for "hotels" bucket
  reply.send({
    status: 'ok',
    uptime: process.uptime()
  });
});

// Error handler
fastify.setErrorHandler((err, req, rep) => {
  req.log.error(err);
  const status = err.statusCode || 500;
  rep.status(status).send({ error: err.message });
});

// Start server
const port = process.env.PORT || 4001;
fastify.listen({ port, host: '0.0.0.0' })
  .then(() => {
    fastify.log.info(`Hotels service listening on port ${port}`);
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });