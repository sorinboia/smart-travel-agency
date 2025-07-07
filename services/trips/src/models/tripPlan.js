import { ObjectId } from 'mongodb';

export async function createTrip(fastify, { userId, name, flightBookingIds, hotelBookingIds }) {
  const now = new Date();
  const doc = {
    userId: new ObjectId(userId),
    name: name || '',
    flightBookingIds: flightBookingIds || [],
    hotelBookingIds: hotelBookingIds || [],
    createdAt: now,
    updatedAt: now,
    status: 'active'
  };
  const result = await fastify.mongo.db.collection('trip_plans').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function listTrips(fastify, userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const cursor = fastify.mongo.db.collection('trip_plans').find({
    userId: new ObjectId(userId),
    status: { $ne: 'deleted' }
  }).skip(skip).limit(limit).sort({ createdAt: -1 });
  const trips = await cursor.toArray();
  return trips;
}

export async function getTripById(fastify, userId, tripId) {
  const trip = await fastify.mongo.db.collection('trip_plans').findOne({
    _id: new ObjectId(tripId),
    userId: new ObjectId(userId),
    status: { $ne: 'deleted' }
  });
  return trip;
}

export async function softDeleteTrip(fastify, userId, tripId) {
  const now = new Date();
  const result = await fastify.mongo.db.collection('trip_plans').updateOne(
    {
      _id: new ObjectId(tripId),
      userId: new ObjectId(userId),
      status: { $ne: 'deleted' }
    },
    {
      $set: { status: 'deleted', updatedAt: now }
    }
  );
  return result.modifiedCount > 0;
}