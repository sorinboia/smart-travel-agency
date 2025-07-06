import { promisify } from 'util';

/**
 * In-memory hotel catalogue, loaded from MinIO hotels.json at startup.
 */
let catalogue = [];

/**
 * Loads hotels.json from MinIO bucket "hotels" and populates the in-memory catalogue.
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function loadCatalogue(fastify) {
  const minio = fastify.minio;
  const bucket = process.env.MINIO_BUCKET || 'hotels';
  const objectName = 'hotels.json';

  const getObject = promisify(minio.getObject.bind(minio));
  const stream = await getObject(bucket, objectName);

  let data = '';
  for await (const chunk of stream) {
    data += chunk.toString();
  }
  catalogue = JSON.parse(data);
}

/**
 * Search hotels by filters (city, country, guests, dates, amenities, etc).
 * @param {object} filters
 * @returns {Array}
 */
export function search(filters) {
  return filterHotels(catalogue, filters);
}

/**
 * Find a hotel by its ID.
 * @param {string} id
 * @returns {object|null}
 */
export function findById(id) {
  return catalogue.find(hotel => hotel.id === id) || null;
}

/**
 * Filtering helper, similar to Flights but for hotel attributes.
 */
function filterHotels(hotelsArr, filters) {
  return hotelsArr.filter(hotel => {
    if (filters.city && hotel.city !== filters.city) return false;
    if (filters.country && hotel.country !== filters.country) return false;
    if (filters.guests && hotel.maxGuests < filters.guests) return false;
    if (filters.amenities) {
      const required = Array.isArray(filters.amenities) ? filters.amenities : [filters.amenities];
      if (!required.every(a => hotel.amenities.includes(a))) return false;
    }
    // Add more filter logic as needed (dates, room types, etc)
    return true;
  });
}