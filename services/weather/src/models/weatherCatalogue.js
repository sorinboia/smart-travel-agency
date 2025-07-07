import { promisify } from 'util';

/**
 * In-memory weather catalogue, loaded from MinIO weather.json at startup.
 */
let catalogue = [];

/**
 * Loads weather.json from MinIO bucket "weather" and populates the in-memory catalogue.
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function loadCatalogue(fastify) {
  const minio = fastify.minio;
  const bucket = process.env.MINIO_BUCKET || 'weather';
  const objectName = 'weather.json';

  const getObject = promisify(minio.getObject.bind(minio));
  const stream = await getObject(bucket, objectName);

  let data = '';
  for await (const chunk of stream) {
    data += chunk.toString();
  }
  catalogue = JSON.parse(data);
}

/**
 * Search weather snapshots by filters (iata, city, country, date).
 * @param {object} filters
 * @returns {Array}
 */
export function search(filters) {
  return filterWeather(catalogue, filters);
}

/**
 * Filtering helper for weather attributes.
 */
function filterWeather(arr, filters) {
  let results = arr;

  if (filters.iata) {
    results = results.filter(w =>
      w.location?.iata &&
      w.location.iata.toLowerCase() === filters.iata.toLowerCase()
    );
  }
  if (filters.city) {
    results = results.filter(w =>
      w.location?.city &&
      w.location.city.toLowerCase() === filters.city.toLowerCase()
    );
  }
  if (filters.country) {
    results = results.filter(w =>
      w.location?.country &&
      w.location.country.toLowerCase() === filters.country.toLowerCase()
    );
  }
  if (filters.date) {
    results = results.filter(w =>
      w.date === filters.date
    );
  }

  // Sort by date ascending
  results = results.slice().sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  return results;
}