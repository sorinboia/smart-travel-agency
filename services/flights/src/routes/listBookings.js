import { listBookings } from '../models/booking.js';

export default async function listBookingsRoutes(fastify, opts) {
  fastify.get('/bookings', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user?.sub || req.user?.id;
    const { status, page, limit } = req.query;
    const bookings = await listBookings(fastify, userId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });
    reply.send({ bookings });
  });
}