const { createBooking } = require('../models/booking.js');

module.exports = function (fastify, opts, done) {
  fastify.post('/bookings', async (req, reply) => {
    const userId = req.user?.sub || req.user?.id;
    const { flightId, class: fareClass } = req.body;
    if (!flightId || !fareClass) {
      return reply.code(400).send({ error: 'Missing flightId or class' });
    }
    try {
      const booking = await createBooking(fastify, userId, { flightId, class: fareClass });
      reply.code(201).send(booking);
    } catch (err) {
      if (err.statusCode === 409) {
        reply.code(409).send({ error: err.message });
      } else {
        throw err;
      }
    }
  });
  done();
};