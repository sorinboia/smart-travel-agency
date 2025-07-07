import 'dotenv/config';
// Fastify server bootstrap for STA Weather Service

import Fastify from 'fastify';
import pino from 'pino';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';

import minioPlugin from './plugins/minio.js';

import { loadCatalogue } from './models/weatherCatalogue.js';
import weatherRoutes from './routes/index.js';

import { collectDefaultMetrics, Registry, Histogram } from 'prom-client';
import { v4 as uuidv4 } from 'uuid';

const fastify = Fastify({
  logger: pino({ level: process.env.LOG_LEVEL || 'info' })
});

// Register plugins
await fastify.register(sensible);
await fastify.register(minioPlugin);
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Weather Service API',
      version: '1.0.0'
    },
    components: {
      schemas: {
        Weather: {
          type: 'object',
          properties: {
            weather_id: { type: 'string', format: 'uuid' },
            location: {
              type: 'object',
              properties: {
                iata: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                lat: { type: 'number' },
                lon: { type: 'number' }
              }
            },
            date: { type: 'string', format: 'date' },
            summary: { type: 'string' },
            temp_max_c: { type: 'number' },
            temp_min_c: { type: 'number' },
            precip_mm: { type: 'number' },
            precip_prob: { type: 'number' },
            humidity_pct: { type: 'number' },
            wind_kph: { type: 'number' },
            uvi: { type: 'number' },
            icon: { type: 'string' }
          }
        },
        WeatherList: {
          type: 'array',
          items: { $ref: '#/components/schemas/Weather' }
        },
        NotFound: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    paths: {
      '/weather': {
        get: {
          summary: 'Get weather snapshot(s)',
          parameters: [
            {
              name: 'iata',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            },
            {
              name: 'city',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            },
            {
              name: 'country',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            },
            {
              name: 'date',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'date' }
            }
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WeatherList' }
                }
              }
            },
            404: {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/NotFound' }
                }
              }
            }
          }
        }
      }
    }
  },
  exposeRoute: true,
  routePrefix: '/docs'
});

// Correlation ID middleware
fastify.addHook('onRequest', async (req, reply) => {
  const header = process.env.CORRELATION_HEADER || 'X-Request-Id';
  let reqId = req.headers[header.toLowerCase()];
  if (!reqId) reqId = uuidv4();
  req.id = reqId;
  reply.header(header, reqId);
});

// Prometheus metrics
const register = new Registry();
collectDefaultMetrics({ register });
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route', 'method'],
  buckets: [50, 100, 300, 500, 1000, 2000, 5000]
});
register.registerMetric(httpRequestDuration);

fastify.addHook('onResponse', async (req, reply) => {
  if (req.routeOptions && req.routeOptions.url) {
    httpRequestDuration
      .labels(req.routeOptions.url, req.method)
      .observe(reply.getResponseTime());
  }
});

// Load weather.json from MinIO after plugins are registered
await fastify.after(async () => {
  await loadCatalogue(fastify);
  fastify.log.info('Weather catalogue loaded from MinIO');
});

// Register routes
await fastify.register(weatherRoutes);

// Health check
fastify.get('/healthz', async (req, reply) => {
  try {
    const minio = fastify.minio;
    const bucket = process.env.MINIO_BUCKET || 'weather';
    // Try to stat the bucket to check reachability
    await minio.bucketExists(bucket);
    reply.send({
      status: 'ok',
      uptime: process.uptime(),
      minio: 'reachable'
    });
  } catch (err) {
    reply.code(500).send({
      status: 'error',
      uptime: process.uptime(),
      minio: 'unreachable',
      error: err.message
    });
  }
});

// Prometheus metrics endpoint
fastify.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', register.contentType);
  reply.send(await register.metrics());
});

// Error handler
fastify.setErrorHandler((err, req, rep) => {
  req.log.error(err);
  const status = err.statusCode || 500;
  const envelope = { error: err.message };
  if (err.details) envelope.details = err.details;
  rep.status(status).send(envelope);
});

// Start server
const port = process.env.PORT || 4000;
fastify.listen({ port, host: '0.0.0.0' })
  .then(() => {
    fastify.log.info(`Weather service listening on port ${port}`);
  })
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });