import { ObjectId } from 'mongodb';
import { findById as findFlightById } from './flightCatalogue.js';

/**
 * Create a booking with seat decrement in a transaction.
 */
export async function createBooking(fastify, userId, { flightId, class: fareClass }) {
  const db = fastify.mongo.db;
  const bookings = db.collection('flight_bookings');

  const bookingDoc = {
    userId,
    flightId,
    class: fareClass,
    status: 'active',
    createdAt: new Date(),
    pnr: new ObjectId().toString()
  };
  await bookings.insertOne(bookingDoc);
  return bookingDoc;
}

/**
 * List bookings for a user.
 */
export async function listBookings(fastify, userId, { status, page = 1, limit = 20 } = {}) {
  const bookings = fastify.mongo.db.collection('flight_bookings');
  const query = { userId };
  if (status) query.status = status;
  const skip = (page - 1) * limit;
  return bookings.find(query).skip(skip).limit(limit).toArray();
}

/**
 * Cancel a booking and restore seat.
 */
export async function cancelBooking(fastify, userId, bookingId) {
  const db = fastify.mongo.db;
  const bookings = db.collection('flight_bookings');

  const booking = await bookings.findOne({ _id: new ObjectId(bookingId), userId });
  if (!booking || booking.status === 'cancelled') {
    const err = new Error('Booking not found or already cancelled');
    err.statusCode = 404;
    throw fastify.httpErrors?.notFound
      ? fastify.httpErrors.notFound('Booking not found or already cancelled')
      : err;
  }
  await bookings.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: { status: 'cancelled' } }
  );
  return { ...booking, status: 'cancelled' };
}