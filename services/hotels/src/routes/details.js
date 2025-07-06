import fp from 'fastify-plugin';
import { findById } from '../models/hotelCatalogue.js';

export default fp(async (fastify) => {
  fastify.get('/hotels/:hotelId', async (req, reply) => {
    const hotel = findById(req.params.hotelId);
    if (!hotel) {
      return reply.code(404).send({ error: 'Hotel not found' });
    }
    reply.send({ data: hotel });
  });
});