// End-to-end API tests for STA Flights Service (ESM version)

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

// Mock authenticatePlugin
const authenticatePlugin = fp(async (fastify) => {
  fastify.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
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
  mongod = await MongoMemoryServer.create();
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

  // Insert inventory for booking tests
  await fastify.ready();
  const inventory = fastify.mongo.db.collection('inventory');
  await inventory.deleteMany({}); // Ensure clean state
  await inventory.insertOne({
    flight_id: 'flight-1',
    class: 'Economy',
    seats_left: 2
  });

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
    // Insert inventory for flight-1 before booking
    await fastify.mongo.db.collection('inventory').updateOne(
      { flight_id: 'flight-1', class: 'Economy' },
      { $set: { seats_left: 2 } },
      { upsert: true }
    );
    const res = await supertest(fastify.server)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ flightId: 'flight-1', class: 'Economy' })
      .expect(201);
    // If booking fails, print error for debugging
    if (res.status !== 201) {
      // eslint-disable-next-line no-console
      console.error('Booking error:', res.body);
    }
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