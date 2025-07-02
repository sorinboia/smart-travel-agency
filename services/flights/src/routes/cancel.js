import { cancelBooking } from '../models/booking.js';

export default async function cancelRoutes(fastify, opts) {
  fastify.delete('/bookings/:bookingId', async (req, reply) => {
    const userId = req.user?.sub || req.user?.id;
    const { bookingId } = req.params;
    try {
      const result = await cancelBooking(fastify, userId, bookingId);
      reply.send(result);
    } catch (err) {
      if (err.statusCode === 404) {
        reply.code(404).send({ error: err.message });
      } else {
        throw err;
      }
    }
  });
}