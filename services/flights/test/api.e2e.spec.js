// End-to-end API tests for STA Flights Service

const Fastify = require('fastify');
const jwtPlugin = require('@fastify/jwt');
const mongoPlugin = require('@fastify/mongodb');
const minioPlugin = require('../src/plugins/minio.js');
const jwtConfig = require('../src/plugins/jwt.js');
const mongoConfig = require('../src/plugins/mongodb.js');
const searchRoutes = require('../src/routes/search.js');
const detailsRoutes = require('../src/routes/details.js');
const bookRoutes = require('../src/routes/book.js');
const listBookingsRoutes = require('../src/routes/listBookings.js');
const cancelRoutes = require('../src/routes/cancel.js');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const fp = require('fastify-plugin');

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
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });

  it('cancels a booking (DELETE /bookings/:bookingId)', async () => {
    // Book a flight first
    // Insert inventory for flight-1 before booking
    await fastify.mongo.db.collection('inventory').updateOne(
      { flight_id: 'flight-1', class: 'Economy' },
      { $set: { seats_left: 2 } },
      { upsert: true }
    );
    const bookRes = await supertest(fastify.server)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ flightId: 'flight-1', class: 'Economy' })
      .expect(201);
    if (bookRes.status !== 201) {
      // eslint-disable-next-line no-console
      console.error('Booking error (cancel test):', bookRes.body);
    }
    const bookingId = bookRes.body._id || bookRes.body.pnr;
    const res = await supertest(fastify.server)
      .delete(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.error('Cancel booking error:', res.body);
    }
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 404 for unknown flight', async () => {
    await supertest(fastify.server)
      .get('/flights/unknown')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404);
  });

  it('returns 409 if booking with no seats', async () => {
    // Book out all seats
    // Insert inventory for flight-1 before booking
    await fastify.mongo.db.collection('inventory').updateOne(
      { flight_id: 'flight-1', class: 'Economy' },
      { $set: { seats_left: 2 } },
      { upsert: true }
    );
    await supertest(fastify.server)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ flightId: 'flight-1', class: 'Economy' })
      .expect(201);
    await supertest(fastify.server)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ flightId: 'flight-1', class: 'Economy' })
      .expect(201);
    // Remove broken res check (res is not defined here)
    await supertest(fastify.server)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ flightId: 'flight-1', class: 'Economy' })
      .expect(409);
  });
});