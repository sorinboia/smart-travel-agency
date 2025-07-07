// E2E tests for Weather Service (Fastify + Supertest)
import Fastify from 'fastify';
import weatherRoutes from '../src/routes/index.js';
import { search, loadCatalogue } from '../src/models/weatherCatalogue.js';

describe('Weather Service API', () => {
  let fastify;

  beforeAll(async () => {
    fastify = Fastify();
    // Register only the weather route for isolated testing
    await fastify.register(weatherRoutes);
    // Stub catalogue with fixture data
    await loadCatalogue({
      minio: {
        getObject: async () => {
          // Return a stream of a small JSON array for testing
          const { Readable } = await import('stream');
          const data = JSON.stringify([
            {
              weather_id: 'w1',
              location: { iata: 'TLV', city: 'Tel Aviv', country: 'Israel' },
              date: '2025-07-07',
              summary: 'Sunny'
            }
          ]);
          return Readable.from([data]);
        }
      }
    });
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('GET /weather returns weather data', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/weather?city=Tel%20Aviv'
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].location.city).toBe('Tel Aviv');
  });

  it('GET /weather returns 404 for no match', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/weather?city=Nowhere'
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('No weather data found');
  });
});