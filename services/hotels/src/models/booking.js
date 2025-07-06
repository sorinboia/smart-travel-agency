// Room availability logic removed for demo: always allow booking
import { ObjectId } from 'mongodb';

/**
 * Create a hotel booking (no availability check).
 */
export async function createBooking(fastify, userId, { hotelId, roomType, checkIn, checkOut }) {
  const bookings = fastify.mongo.db.collection('hotel_bookings');
  const bookingDoc = {
    userId,
    hotelId,
    roomType,
    checkIn,
    checkOut,
    status: 'active',
    createdAt: new Date(),
    bookingRef: new ObjectId().toString()
  };
  await bookings.insertOne(bookingDoc);
  return bookingDoc;
}

/**
 * List bookings for a user.
 */
export async function listBookings(fastify, userId, { status, page = 1, limit = 20 } = {}) {
  const bookings = fastify.mongo.db.collection('hotel_bookings');
  const query = { userId };
  if (status) query.status = status;
  const skip = (page - 1) * limit;
  return bookings.find(query).skip(skip).limit(limit).toArray();
}

/**
 * Cancel a booking (no inventory restore).
 */
export async function cancelBooking(fastify, userId, bookingId) {
  const bookings = fastify.mongo.db.collection('hotel_bookings');
  const booking = await bookings.findOne({ _id: new ObjectId(bookingId), userId });
  if (!booking || booking.status === 'cancelled') {
    throw fastify.httpErrors.notFound('Booking not found or already cancelled');
  }
  await bookings.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: { status: 'cancelled' } }
  );
  return { success: true };
}