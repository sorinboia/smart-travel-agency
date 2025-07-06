import 'dotenv/config';
// Fastify server bootstrap for STA Flights Service

import Fastify from 'fastify';
import pino from 'pino';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';
import sensible from '@fastify/sensible';

import jwtConfig from './plugins/jwt.js';
import mongoConfig from './plugins/mongodb.js';
import minioPlugin from './plugins/minio.js';

import authenticatePlugin from './plugins/authenticate.js';

import { loadCatalogue } from './models/flightCatalogue.js';
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

// Load flights.json from MinIO after plugins are registered
await fastify.after(async () => {
  await loadCatalogue(fastify);
  fastify.log.info('Flight catalogue loaded from MinIO');
});

// Register routes
await fastify.register(searchRoutes);
await fastify.register(detailsRoutes);
await fastify.register(bookRoutes);
await fastify.register(listBookingsRoutes);
await fastify.register(cancelRoutes);

// Health check
fastify.get('/healthz', async (req, reply) => {
  // TODO: Check Mongo and MinIO reachability
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
const port = process.env.PORT || 4002;
fastify.listen({ port, host: '0.0.0.0' })
  .then(() => {
    fastify.log.info(`Flights service listening on port ${port}`);
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });