import fp from 'fastify-plugin';

export default fp(async (fastify) => {
  fastify.decorate('authenticate', async function (req, reply) {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});