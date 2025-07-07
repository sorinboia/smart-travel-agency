import fp from 'fastify-plugin';
import { createTrip } from '../models/tripPlan.js';

export default fp(async (fastify) => {
  fastify.post('/trips', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.sub;
    const { name, flightBookingIds, hotelBookingIds } = req.body;
    const trip = await createTrip(fastify, { userId, name, flightBookingIds, hotelBookingIds });
    reply.code(201).send({ data: trip });
  });
});