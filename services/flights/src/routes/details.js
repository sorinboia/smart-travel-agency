import { findById } from '../models/flightCatalogue.js';

export default async function detailsRoutes(fastify, opts) {
  fastify.get('/flights/:flightId', async (req, reply) => {
    const { flightId } = req.params;
    const flight = findById(flightId);
    if (!flight) {
      return reply.code(404).send({ error: 'Flight not found' });
    }
    reply.send(flight);
  });
}