import fp from 'fastify-plugin';
import { search } from '../models/hotelCatalogue.js';

export default fp(async (fastify) => {
  fastify.get('/hotels', async (req, reply) => {
    const filters = req.query;
    const results = search(filters);
    reply.send({ data: results });
  });
});