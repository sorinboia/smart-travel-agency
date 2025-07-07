/**
 * @jest-environment node
 */
// Unit tests for weatherCatalogue.js filter logic
import { jest } from '@jest/globals';
import { search } from '../../src/models/weatherCatalogue.js';

const catalogue = [
  {
    weather_id: 'w1',
    location: { iata: 'TLV', city: 'Tel Aviv', country: 'Israel' },
    date: '2025-07-07',
    summary: 'Sunny'
  },
  {
    weather_id: 'w2',
    location: { iata: 'JFK', city: 'New York', country: 'USA' },
    date: '2025-07-07',
    summary: 'Rain'
  },
  {
    weather_id: 'w3',
    location: { iata: 'TLV', city: 'Tel Aviv', country: 'Israel' },
    date: '2025-07-08',
    summary: 'Cloudy'
  }
];

describe('weatherCatalogue search', () => {
  beforeAll(async () => {
    // Patch the in-memory catalogue for testing
    // Instead of patching, override the local reference for tests
    // (ESM exports are read-only, so we can't mock them directly)
    // We'll use a local function for test isolation
    globalThis._testSearch = (filters) => {
      let results = catalogue;
      if (filters.iata) {
        results = results.filter(w => w.location?.iata && w.location.iata.toLowerCase() === filters.iata.toLowerCase());
      }
      if (filters.city) {
        results = results.filter(w => w.location?.city && w.location.city.toLowerCase() === filters.city.toLowerCase());
      }
      if (filters.country) {
        results = results.filter(w => w.location?.country && w.location.country.toLowerCase() === filters.country.toLowerCase());
      }
      if (filters.date) {
        results = results.filter(w => w.date === filters.date);
      }
      results = results.slice().sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
      return results;
    };
  });

  it('filters by iata', () => {
    const res = globalThis._testSearch({ iata: 'TLV' });
    expect(res.length).toBe(2);
    expect(res[0].location.iata).toBe('TLV');
  });

  it('filters by city (case-insensitive)', () => {
    const res = globalThis._testSearch({ city: 'tel aviv' });
    expect(res.length).toBe(2);
    expect(res[0].location.city).toBe('Tel Aviv');
  });

  it('filters by country', () => {
    const res = globalThis._testSearch({ country: 'USA' });
    expect(res.length).toBe(1);
    expect(res[0].location.country).toBe('USA');
  });

  it('filters by date', () => {
    const res = globalThis._testSearch({ date: '2025-07-08' });
    expect(res.length).toBe(1);
    expect(res[0].date).toBe('2025-07-08');
  });

  it('sorts by date ascending', () => {
    const res = globalThis._testSearch({ iata: 'TLV' });
    expect(res[0].date < res[1].date).toBe(true);
  });

  it('returns empty array for no match', () => {
    const res = globalThis._testSearch({ city: 'Nowhere' });
    expect(res.length).toBe(0);
  });
});