import fp from 'fastify-plugin';
import { getTripById } from '../models/tripPlan.js';

export default fp(async (fastify) => {
  fastify.get('/trips/:tripId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const { tripId } = req.params;
    const trip = await getTripById(fastify, userId, tripId);
    if (!trip) {
      return reply.code(404).send({ error: 'Trip not found' });
    }
    reply.send({ data: trip });
  });
});