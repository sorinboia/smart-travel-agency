const { findById } = require('../models/flightCatalogue.js');

module.exports = function (fastify, opts, done) {
  fastify.get('/flights/:flightId', async (req, reply) => {
    const { flightId } = req.params;
    const flight = findById(flightId);
    if (!flight) {
      return reply.code(404).send({ error: 'Flight not found' });
    }
    reply.send(flight);
  });
  done();
};