// JWT plugin config for Fastify

export default {
  secret: process.env.JWT_SECRET || 'changeme-32bytes-min',
  sign: { expiresIn: '365d' }
};