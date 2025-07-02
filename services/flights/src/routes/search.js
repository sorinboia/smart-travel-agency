import { search } from '../models/flightCatalogue.js';

export default async function searchRoutes(fastify, opts) {
  fastify.get('/flights', async (req, reply) => {
    const { origin, destination, departureDate, class: fareClass } = req.query;
    const filters = { origin, destination, departureDate, class: fareClass };
    const results = search(filters);
    reply.send({ flights: results });
  });
}