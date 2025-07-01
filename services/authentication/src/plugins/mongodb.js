// MongoDB plugin config for Fastify

export default {
  forceClose: true,
  url: process.env.MONGODB_URI || 'mongodb://admin:admin@mongodb:27017/sta?authSource=admin'
};