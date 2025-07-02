const { listBookings } = require('../models/booking.js');

module.exports = function (fastify, opts, done) {
  fastify.get('/bookings', async (req, reply) => {
    const userId = req.user?.sub || req.user?.id;
    const { status, page, limit } = req.query;
    const bookings = await listBookings(fastify, userId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });
    reply.send({ bookings });
  });
  done();
};