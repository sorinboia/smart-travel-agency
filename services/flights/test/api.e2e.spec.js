/* End-to-end API tests for STA Flights Service (ESM version) */

import Fastify from 'fastify';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';
import minioPlugin from '../src/plugins/minio.js';
import jwtConfig from '../src/plugins/jwt.js';
import mongoConfig from '../src/plugins/mongodb.js';
import searchRoutes from '../src/routes/search.js';
import detailsRoutes from '../src/routes/details.js';
import bookRoutes from '../src/routes/book.js';
import listBookingsRoutes from '../src/routes/listBookings.js';
import cancelRoutes from '../src/routes/cancel.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import fp from 'fastify-plugin';
import { __setTestFlights__ } from '../src/models/flightCatalogue.js';

// Mock authenticatePlugin
const authenticatePlugin = fp(async (fastify) => {
  fastify.decorate('authenticate', async function (req, reply) {
    try {
      req.user = await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

// Mock MinIO client to read local file
const minioMockPlugin = fp(async (fastify) => {
  fastify.decorate('minio', {
    getObject: async (bucket, object) => {
      const filePath = path.resolve('minio', object);
      const data = await fs.readFile(filePath);
      const { Readable } = await import('stream');
      return Readable.from([data]);
    }
  });
});

let fastify, mongod, uri, jwtToken;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { port: 27018, ip: '127.0.0.1', storageEngine: 'ephemeralForTest' }
  });
  uri = mongod.getUri();
  fastify = Fastify();
  await fastify.register(mongoPlugin, { ...mongoConfig, url: uri });
  await fastify.register(minioMockPlugin);
  await fastify.register(jwtPlugin, { ...jwtConfig, secret: 'testsecret' });
  await fastify.register(authenticatePlugin);
  await fastify.register(searchRoutes);
  await fastify.register(detailsRoutes);
  await fastify.register(bookRoutes);
  await fastify.register(listBookingsRoutes);
  await fastify.register(cancelRoutes);
// Patch in-memory flights for test fallback
__setTestFlights__([
  {
    flight_id: 'flight-1',
    origin: { iata: 'TLV' },
    destination: { iata: 'JFK' },
    departure_utc: '2025-07-10T08:00:00Z',
    duration_min: 600,
    class_fares: [
      { class: 'Economy', seats_left: 2, price: { amount: 500 } },
      { class: 'Business', seats_left: 0, price: { amount: 1200 } }
    ]
  }
]);

  // Generate JWT
  jwtToken = fastify.jwt.sign({ sub: 'user1', email: 'user1@example.com' });
});

afterAll(async () => {
  await fastify.close();
  await mongod.stop();
});

describe('Flights API', () => {
  it('searches for flights (GET /flights)', async () => {
    const res = await supertest(fastify.server)
      .get('/flights')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(Array.isArray(res.body.flights)).toBe(true);
  });

  it('gets flight details (GET /flights/:flightId)', async () => {
    const res = await supertest(fastify.server)
      .get('/flights/flight-1')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(res.body.flight_id).toBe('flight-1');
  });

  it('books a flight (POST /bookings)', async () => {
    const res = await supertest(fastify.server)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ flightId: 'flight-1', class: 'Economy' })
      .expect(201);
    expect(res.body.flightId).toBe('flight-1');
    expect(res.body.class).toBe('Economy');
    expect(res.body.status).toBe('active');
  });

  it('lists bookings (GET /bookings)', async () => {
    const res = await supertest(fastify.server)
      .get('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });
});