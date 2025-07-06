import { ObjectId } from 'mongodb';
import { findById as findHotelById } from './hotelCatalogue.js';

/**
 * Create a hotel booking with room decrement in a transaction.
 */
export async function createBooking(fastify, userId, { hotelId, roomType, checkIn, checkOut }) {
  const client = fastify.mongo.client;
  const db = fastify.mongo.db;
  const bookings = db.collection('hotel_bookings');
  const inventory = db.collection('hotel_inventory');

  // Helper: Seed inventory for a hotel/roomType/date if missing, using catalogue
  async function seedInventoryIfMissing({ hotelId, roomType, checkIn, checkOut, session }) {
    const hotel = findHotelById(hotelId);
    if (!hotel) return false;
    const roomInfo = hotel.room_types?.find(rt => rt.type === roomType);
    if (!roomInfo || roomInfo.rooms_left <= 0) return false;
    // Insert with rooms_left - 1 (consume 1 for this booking)
    await inventory.insertOne(
      {
        hotel_id: hotelId,
        room_type: roomType,
        check_in: checkIn,
        check_out: checkOut,
        rooms_left: roomInfo.rooms_left - 1
      },
      session ? { session } : undefined
    );
    return true;
  }

  let bookingDoc;
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const session = client.startSession();
    try {
      // Detect if transactions are supported
      let transactionSupported = true;
      try {
        await session.withTransaction(async () => {});
      } catch (e) {
        if (e && e.code === 20) {
          transactionSupported = false;
        } else {
          throw e;
        }
      }

      if (transactionSupported) {
        try {
          await session.withTransaction(async () => {
            // Decrement room
            let invRes = await inventory.updateOne(
              { hotel_id: hotelId, room_type: roomType, check_in: checkIn, check_out: checkOut, rooms_left: { $gt: 0 } },
              { $inc: { rooms_left: -1 } },
              { session }
            );
            if (invRes.matchedCount === 0) {
              // Try to seed inventory if missing
              const seeded = await seedInventoryIfMissing({ hotelId, roomType, checkIn, checkOut, session });
              if (!seeded) {
                throw fastify.httpErrors.conflict('Insufficient rooms');
              }
              // Try decrement again (should succeed now)
              invRes = await inventory.updateOne(
                { hotel_id: hotelId, room_type: roomType, check_in: checkIn, check_out: checkOut, rooms_left: { $gt: 0 } },
                { $inc: { rooms_left: -1 } },
                { session }
              );
              if (invRes.matchedCount === 0) {
                throw fastify.httpErrors.conflict('Insufficient rooms');
              }
            }
            // Create booking
            bookingDoc = {
              userId,
              hotelId,
              roomType,
              checkIn,
              checkOut,
              status: 'active',
              createdAt: new Date(),
              bookingRef: new ObjectId().toString()
            };
            await bookings.insertOne(bookingDoc, { session });
          });
        } catch (e) {
          if (e && e.code === 20) {
            transactionSupported = false;
          } else {
            throw e;
          }
        }
      }
      if (!transactionSupported) {
        // Fallback: no transaction/session
        let invRes = await inventory.updateOne(
          { hotel_id: hotelId, room_type: roomType, check_in: checkIn, check_out: checkOut, rooms_left: { $gt: 0 } },
          { $inc: { rooms_left: -1 } }
        );
        if (invRes.matchedCount === 0) {
          const seeded = await seedInventoryIfMissing({ hotelId, roomType, checkIn, checkOut });
          if (!seeded) {
            const err = new Error('Insufficient rooms');
            err.statusCode = 409;
            throw fastify.httpErrors?.conflict
              ? fastify.httpErrors.conflict('Insufficient rooms')
              : err;
          }
          // Try decrement again (should succeed now)
          invRes = await inventory.updateOne(
            { hotel_id: hotelId, room_type: roomType, check_in: checkIn, check_out: checkOut, rooms_left: { $gt: 0 } },
            { $inc: { rooms_left: -1 } }
          );
          if (invRes.matchedCount === 0) {
            const err = new Error('Insufficient rooms');
            err.statusCode = 409;
            throw fastify.httpErrors?.conflict
              ? fastify.httpErrors.conflict('Insufficient rooms')
              : err;
          }
        }
        // Create booking
        bookingDoc = {
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
      }
      await session.endSession();
      return bookingDoc;
    } catch (err) {
      await session.endSession();
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.error('Booking error (createBooking):', err);
      }
      if (attempt >= 3) throw err;
    }
  }
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
 * Cancel a booking and restore room.
 */
export async function cancelBooking(fastify, userId, bookingId) {
  const client = fastify.mongo.client;
  const db = fastify.mongo.db;
  const bookings = db.collection('hotel_bookings');
  const inventory = db.collection('hotel_inventory');

  let attempt = 0;
  let booking;
  let transactionSupported = true;

  while (attempt < 3) {
    attempt++;
    const session = client.startSession();
    try {
      if (attempt === 1) {
        try {
          await session.withTransaction(async () => {});
        } catch (e) {
          if (e && e.code === 20) {
            transactionSupported = false;
          } else {
            throw e;
          }
        }
      }

      if (transactionSupported) {
        try {
          await session.withTransaction(async () => {
            booking = await bookings.findOne({ _id: new ObjectId(bookingId), userId });
            if (!booking || booking.status === 'cancelled') {
              throw fastify.httpErrors.notFound('Booking not found or already cancelled');
            }
            await bookings.updateOne(
              { _id: new ObjectId(bookingId) },
              { $set: { status: 'cancelled' } },
              { session }
            );
            await inventory.updateOne(
              {
                hotel_id: booking.hotelId,
                room_type: booking.roomType,
                check_in: booking.checkIn,
                check_out: booking.checkOut
              },
              { $inc: { rooms_left: 1 } },
              { session }
            );
          });
        } catch (e) {
          if (e && e.code === 20) {
            transactionSupported = false;
          } else {
            throw e;
          }
        }
      }
      if (!transactionSupported) {
        booking = await bookings.findOne({ _id: new ObjectId(bookingId), userId });
        if (!booking || booking.status === 'cancelled') {
          throw fastify.httpErrors.notFound('Booking not found or already cancelled');
        }
        await bookings.updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { status: 'cancelled' } }
        );
        await inventory.updateOne(
          {
            hotel_id: booking.hotelId,
            room_type: booking.roomType,
            check_in: booking.checkIn,
            check_out: booking.checkOut
          },
          { $inc: { rooms_left: 1 } }
        );
      }
      await session.endSession();
      return { success: true };
    } catch (err) {
      await session.endSession();
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.error('Booking error (cancelBooking):', err);
      }
      if (attempt >= 3) throw err;
    }
  }
}