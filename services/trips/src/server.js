import 'dotenv/config';
// Fastify server bootstrap for STA Trips Service

import Fastify from 'fastify';
import pino from 'pino';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';
import sensible from '@fastify/sensible';
import promClient from 'prom-client';

import jwtConfig from './plugins/jwt.js';
import mongoConfig from './plugins/mongodb.js';
import authenticatePlugin from './plugins/authenticate.js';

import createRoutes from './routes/create.js';
import listRoutes from './routes/list.js';
import detailsRoutes from './routes/details.js';
import removeRoutes from './routes/remove.js';

const fastify = Fastify({
  logger: pino({ level: process.env.LOG_LEVEL || 'info' })
});

// Prometheus metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['route', 'method', 'status']
});
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route'],
  buckets: [50, 100, 300, 500, 1000, 2000, 5000]
});

fastify.addHook('onResponse', (req, reply, done) => {
  const route = req.routerPath || req.raw.url;
  httpRequestCounter.inc({
    route,
    method: req.method,
    status: reply.statusCode
  });
  httpRequestDuration.observe({ route }, reply.getResponseTime());
  done();
});

// Register plugins
await fastify.register(mongoPlugin, mongoConfig);
await fastify.register(jwtPlugin, jwtConfig);
await fastify.register(sensible);
await fastify.register(authenticatePlugin);

// Register routes
await fastify.register(createRoutes);
await fastify.register(listRoutes);
await fastify.register(detailsRoutes);
await fastify.register(removeRoutes);

// Metrics endpoint
fastify.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', promClient.register.contentType);
  return promClient.register.metrics();
});

// Health check
fastify.get('/healthz', async (req, reply) => {
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
const port = process.env.PORT || 4003;
fastify.listen({ port, host: '0.0.0.0' })
  .then(() => {
    fastify.log.info(`Trips service listening on port ${port}`);
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });