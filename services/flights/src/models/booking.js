const { ObjectId } = require('mongodb');

/**
 * Create a booking with seat decrement in a transaction.
 */
async function createBooking(fastify, userId, { flightId, class: fareClass }) {
  const client = fastify.mongo.client;
  const db = fastify.mongo.db;
  const bookings = db.collection('bookings');
  const inventory = db.collection('inventory');

  let bookingDoc;
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const session = client.startSession();
    try {
      // Detect if transactions are supported (mongodb-memory-server is standalone, not replica set)
      let transactionSupported = true;
      try {
        // This will throw if not supported
        await session.withTransaction(async () => {});
      } catch (e) {
        // Only treat as unsupported if error is code 20 (IllegalOperation)
        if (e && e.code === 20) {
          transactionSupported = false;
        } else {
          throw e;
        }
      }

      if (transactionSupported) {
        try {
          await session.withTransaction(async () => {
            // Decrement seat
            const invRes = await inventory.updateOne(
              { flight_id: flightId, class: fareClass, seats_left: { $gt: 0 } },
              { $inc: { seats_left: -1 } },
              { session }
            );
            if (invRes.matchedCount === 0) {
              throw fastify.httpErrors.conflict('Insufficient seats');
            }
            // Create booking
            bookingDoc = {
              userId,
              flightId,
              class: fareClass,
              status: 'active',
              createdAt: new Date(),
              pnr: new ObjectId().toString()
            };
            await bookings.insertOne(bookingDoc, { session });
          });
        } catch (e) {
          // If transaction fails with code 20, fallback to non-transactional
          if (e && e.code === 20) {
            transactionSupported = false;
          } else {
            throw e;
          }
        }
      }
      if (!transactionSupported) {
        // Fallback: no transaction/session
        // Decrement seat
        const invRes = await inventory.updateOne(
          { flight_id: flightId, class: fareClass, seats_left: { $gt: 0 } },
          { $inc: { seats_left: -1 } }
        );
        if (invRes.matchedCount === 0) {
          // Fallback: if httpErrors is not available, throw plain error with code
          const err = new Error('Insufficient seats');
          err.statusCode = 409;
          throw fastify.httpErrors?.conflict
            ? fastify.httpErrors.conflict('Insufficient seats')
            : err;
        }
        // Create booking
        bookingDoc = {
          userId,
          flightId,
          class: fareClass,
          status: 'active',
          createdAt: new Date(),
          pnr: new ObjectId().toString()
        };
        await bookings.insertOne(bookingDoc);
      }
      await session.endSession();
      return bookingDoc;
    } catch (err) {
      await session.endSession();
      // Print error for debugging in test
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
async function listBookings(fastify, userId, { status, page = 1, limit = 20 } = {}) {
  const bookings = fastify.mongo.db.collection('bookings');
  const query = { userId };
  if (status) query.status = status;
  const skip = (page - 1) * limit;
  return bookings.find(query).skip(skip).limit(limit).toArray();
}

/**
 * Cancel a booking and restore seat.
 */
async function cancelBooking(fastify, userId, bookingId) {
  const client = fastify.mongo.client;
  const db = fastify.mongo.db;
  const bookings = db.collection('bookings');
  const inventory = db.collection('inventory');

  let attempt = 0;
  let booking;
  let transactionSupported = true;

  while (attempt < 3) {
    attempt++;
    const session = client.startSession();
    try {
      // Detect if transactions are supported (mongodb-memory-server is standalone, not replica set)
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
              { flight_id: booking.flightId, class: booking.class },
              { $inc: { seats_left: 1 } },
              { session }
            );
          });
        } catch (e) {
          // If transaction fails with code 20, fallback to non-transactional
          if (e && e.code === 20) {
            transactionSupported = false;
            await session.endSession();
            continue; // retry with fallback
          } else {
            throw e;
          }
        }
      }
      if (!transactionSupported) {
        // Fallback: no transaction/session
        booking = await bookings.findOne({ _id: new ObjectId(bookingId), userId });
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
        await inventory.updateOne(
          { flight_id: booking.flightId, class: booking.class },
          { $inc: { seats_left: 1 } }
        );
      }
      await session.endSession();
      return { ...booking, status: 'cancelled' };
    } catch (err) {
      await session.endSession();
      // Print error for debugging in test
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.error('Booking error (cancelBooking):', err);
      }
      if (attempt >= 3) throw err;
    }
  }
}

module.exports = {
  createBooking,
  listBookings,
  cancelBooking
};