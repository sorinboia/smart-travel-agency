const fp = require('fastify-plugin');
const { Client } = require('minio');

module.exports = fp(async (fastify) => {
  const client = new Client({
    endPoint: (process.env.MINIO_ENDPOINT || 'minio').replace(/^https?:\/\//, ''),
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
    secretKey: process.env.MINIO_SECRET_KEY || 'minio123'
  });
  fastify.decorate('minio', client);
});