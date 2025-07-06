import fp from 'fastify-plugin';
import { createBooking } from '../models/booking.js';

export default fp(async (fastify) => {
  fastify.post('/bookings', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { hotelId, roomType, checkIn, checkOut } = req.body;
    try {
      const booking = await createBooking(fastify, req.user.userId, { hotelId, roomType, checkIn, checkOut });
      reply.send({ data: booking });
    } catch (err) {
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });
});