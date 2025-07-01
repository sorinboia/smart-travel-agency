import fp from 'fastify-plugin';

// Decorates fastify.authenticate for JWT-protected routes
async function authDecorator(fastify) {
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}

export default fp(authDecorator);