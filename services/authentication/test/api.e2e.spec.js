// End-to-end API tests for STA Authentication Service

import Fastify from 'fastify';
import jwtPlugin from '@fastify/jwt';
import mongoPlugin from '@fastify/mongodb';
import registerRoutes from '../src/routes/register.js';
import loginRoutes from '../src/routes/login.js';
import meRoutes from '../src/routes/me.js';
import jwtConfig from '../src/plugins/jwt.js';
import mongoConfig from '../src/plugins/mongodb.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

let fastify, mongod, uri;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  uri = mongod.getUri();
  fastify = Fastify();
  await fastify.register(mongoPlugin, { ...mongoConfig, url: uri });
  await fastify.register(jwtPlugin, jwtConfig);
  await fastify.register(registerRoutes, { prefix: '/auth' });
  await fastify.register(loginRoutes, { prefix: '/auth' });
  await fastify.register(meRoutes, { prefix: '/auth' });
  // Ensure users index
  await fastify.mongo.db.collection('users').createIndex({ email: 1 }, { unique: true });
  await fastify.ready();
});

afterAll(async () => {
  await fastify.close();
  await mongod.stop();
});

describe('Authentication API', () => {
  it('registers a new user and returns JWT', async () => {
    const res = await supertest(fastify.server)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', fullName: 'Test User' })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();
  });

  it('prevents duplicate registration', async () => {
    await supertest(fastify.server)
      .post('/auth/register')
      .send({ email: 'dupe@example.com', password: 'Password123', fullName: 'Dupe' })
      .expect(201);

    const res = await supertest(fastify.server)
      .post('/auth/register')
      .send({ email: 'dupe@example.com', password: 'Password123', fullName: 'Dupe' })
      .expect(409);

    expect(res.body.error).toMatch(/already registered/i);
  });

  it('logs in with correct credentials', async () => {
    await supertest(fastify.server)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'Password123', fullName: 'Login User' })
      .expect(201);

    const res = await supertest(fastify.server)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'Password123' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    await supertest(fastify.server)
      .post('/auth/register')
      .send({ email: 'fail@example.com', password: 'Password123', fullName: 'Fail User' })
      .expect(201);

    const res = await supertest(fastify.server)
      .post('/auth/login')
      .send({ email: 'fail@example.com', password: 'WrongPassword' })
      .expect(401);

    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns current user profile with valid JWT', async () => {
    const reg = await supertest(fastify.server)
      .post('/auth/register')
      .send({ email: 'me@example.com', password: 'Password123', fullName: 'Me User' })
      .expect(201);

    const token = reg.body.token;
    const res = await supertest(fastify.server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('me@example.com');
  });

  it('rejects /me with invalid JWT', async () => {
    const res = await supertest(fastify.server)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalidtoken')
      .expect(401);

    expect(res.body.error).toMatch(/unauthorized/i);
  });
});