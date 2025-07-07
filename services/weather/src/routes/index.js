import fp from 'fastify-plugin';
import { search } from '../models/weatherCatalogue.js';

export default fp(async (fastify) => {
  fastify.get('/weather', async (req, reply) => {
    const filters = req.query;
    const results = search(filters);
    if (!results.length) {
      return reply.code(404).send({ error: 'No weather data found' });
    }
    reply.send(results);
  });
});