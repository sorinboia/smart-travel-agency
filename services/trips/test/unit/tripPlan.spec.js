import Fastify from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as tripPlanModel from '../../src/models/tripPlan.js';

describe('tripPlan model', () => {
  let fastify, mongod, uri, userId, tripId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    fastify = Fastify();
    await fastify.register(import('@fastify/mongodb'), { url: uri, database: 'travel' });
    userId = '64b7f1f1f1f1f1f1f1f1f1f1'; // fake ObjectId
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
    await mongod.stop();
  });

  it('creates a trip', async () => {
    const trip = await tripPlanModel.createTrip(fastify, {
      userId,
      name: 'Test Trip',
      flightBookingIds: ['f1', 'f2'],
      hotelBookingIds: ['h1']
    });
    expect(trip).toHaveProperty('_id');
    expect(trip.name).toBe('Test Trip');
    tripId = trip._id;
  });

  it('lists trips', async () => {
    const trips = await tripPlanModel.listTrips(fastify, userId, 1, 10);
    expect(Array.isArray(trips)).toBe(true);
    expect(trips.length).toBeGreaterThan(0);
  });

  it('gets trip by id', async () => {
    const trip = await tripPlanModel.getTripById(fastify, userId, tripId);
    expect(trip).toBeTruthy();
    expect(trip._id.toString()).toBe(tripId.toString());
  });

  it('soft deletes a trip', async () => {
    const deleted = await tripPlanModel.softDeleteTrip(fastify, userId, tripId);
    expect(deleted).toBe(true);
    const trip = await tripPlanModel.getTripById(fastify, userId, tripId);
    expect(trip).toBeNull();
  });
});