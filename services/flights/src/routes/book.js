import { createBooking } from '../models/booking.js';

export default async function bookRoutes(fastify, opts) {
  fastify.post('/bookings', async (req, reply) => {
    const userId = req.user?.sub || req.user?.id;
    const { flightId, class: fareClass } = req.body;
    if (!flightId || !fareClass) {
      return reply.code(400).send({ error: 'Missing flightId or class' });
    }
    try {
      const booking = await createBooking(fastify, userId, { flightId, class: fareClass });
      reply.code(201).send(booking);
    } catch (err) {
      if (err.statusCode === 409) {
        reply.code(409).send({ error: err.message });
      } else {
        throw err;
      }
    }
  });
}