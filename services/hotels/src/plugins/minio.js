import fp from 'fastify-plugin';
import { Client } from 'minio';

// Default bucket for Hotels service: "hotels"
export default fp(async (fastify) => {
  const client = new Client({
    endPoint: (process.env.MINIO_ENDPOINT || 'minio')
      .replace(/^https?:\/\//, '')
      .replace(/:\d+$/, ''), // Remove :port if present
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
    secretKey: process.env.MINIO_SECRET_KEY || 'minio123'
  });
  fastify.decorate('minio', client);
});