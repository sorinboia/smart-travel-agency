import fp from 'fastify-plugin';
import { softDeleteTrip } from '../models/tripPlan.js';

export default fp(async (fastify) => {
  fastify.delete('/trips/:tripId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const { tripId } = req.params;
    const deleted = await softDeleteTrip(fastify, userId, tripId);
    if (!deleted) {
      return reply.code(404).send({ error: 'Trip not found' });
    }
    reply.code(204).send();
  });
});