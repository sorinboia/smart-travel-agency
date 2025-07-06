import fp from 'fastify-plugin';
import { listBookings } from '../models/booking.js';

export default fp(async (fastify) => {
  fastify.get('/bookings', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { status, page, limit } = req.query;
    try {
      const bookings = await listBookings(fastify, req.user.userId, { status, page: Number(page) || 1, limit: Number(limit) || 20 });
      reply.send({ data: bookings });
    } catch (err) {
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });
});