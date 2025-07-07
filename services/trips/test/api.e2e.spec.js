import Fastify from 'fastify';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';
import jwtConfig from '../src/plugins/jwt.js';
import mongoConfig from '../src/plugins/mongodb.js';
import authenticatePlugin from '../src/plugins/authenticate.js';
import createRoutes from '../src/routes/create.js';
import listRoutes from '../src/routes/list.js';
import detailsRoutes from '../src/routes/details.js';
import removeRoutes from '../src/routes/remove.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

describe('Trips Service API', () => {
  let fastify, mongod, uri, jwtToken, userId, tripId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      instance: { port: 27019, ip: '127.0.0.1', storageEngine: 'ephemeralForTest' }
    });
    uri = mongod.getUri();
    fastify = Fastify();
    await fastify.register(mongoPlugin, { ...mongoConfig, url: uri });
    await fastify.register(jwtPlugin, { ...jwtConfig, secret: 'testsecret' });
    await fastify.register(authenticatePlugin);
    await fastify.register(createRoutes);
    await fastify.register(listRoutes);
    await fastify.register(detailsRoutes);
    await fastify.register(removeRoutes);
    userId = '64b7f1f1f1f1f1f1f1f1f1f1';
    jwtToken = fastify.jwt.sign({ sub: userId, email: 'user1@example.com' });
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
    await mongod.stop();
  });

  it('creates a trip (POST /trips)', async () => {
    const res = await supertest(fastify.server)
      .post('/trips')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'My Trip',
        flightBookingIds: ['f1', 'f2'],
        hotelBookingIds: ['h1']
      })
      .expect(201);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.name).toBe('My Trip');
    tripId = res.body.data._id;
  });

  it('lists trips (GET /trips)', async () => {
    const res = await supertest(fastify.server)
      .get('/trips')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('gets trip details (GET /trips/:tripId)', async () => {
    const res = await supertest(fastify.server)
      .get(`/trips/${tripId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data._id).toBe(tripId);
  });

  it('soft deletes a trip (DELETE /trips/:tripId)', async () => {
    await supertest(fastify.server)
      .delete(`/trips/${tripId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);

    // Should not be found after deletion
    await supertest(fastify.server)
      .get(`/trips/${tripId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404);
  });

  it('returns 401 for missing/invalid JWT', async () => {
    await supertest(fastify.server)
      .get('/trips')
      .expect(401);
  });

  it('returns 404 for non-existent trip', async () => {
    await supertest(fastify.server)
      .get('/trips/000000000000000000000000')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404);
  });
});