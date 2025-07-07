import fp from 'fastify-plugin';
import { listTrips } from '../models/tripPlan.js';

export default fp(async (fastify) => {
  fastify.get('/trips', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const trips = await listTrips(fastify, userId, page, limit);
    reply.send({ data: trips });
  });
});