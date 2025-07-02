const { search } = require('../models/flightCatalogue.js');

module.exports = function (fastify, opts, done) {
  fastify.get('/flights', async (req, reply) => {
    const { origin, destination, departureDate, class: fareClass } = req.query;
    const filters = { origin, destination, departureDate, class: fareClass };
    const results = search(filters);
    reply.send({ flights: results });
  });
  done();
};