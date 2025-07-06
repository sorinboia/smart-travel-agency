import fp from 'fastify-plugin';
import { cancelBooking } from '../models/booking.js';

export default fp(async (fastify) => {
  fastify.post('/bookings/:id/cancel', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    try {
      const result = await cancelBooking(fastify, req.user.userId, req.params.id);
      reply.send({ data: result });
    } catch (err) {
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });
});