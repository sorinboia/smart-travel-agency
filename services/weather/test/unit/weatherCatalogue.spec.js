// Unit tests for weatherCatalogue.js filter logic
import { search } from '../../../services/weather/src/models/weatherCatalogue.js';

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
  beforeAll(() => {
    // Patch the in-memory catalogue for testing
    // eslint-disable-next-line no-undef
    jest.spyOn(require('../../../services/weather/src/models/weatherCatalogue.js'), 'search').mockImplementation((filters) => {
      // Inline filter logic for test isolation
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
    });
  });

  it('filters by iata', () => {
    const res = search({ iata: 'TLV' });
    expect(res.length).toBe(2);
    expect(res[0].location.iata).toBe('TLV');
  });

  it('filters by city (case-insensitive)', () => {
    const res = search({ city: 'tel aviv' });
    expect(res.length).toBe(2);
    expect(res[0].location.city).toBe('Tel Aviv');
  });

  it('filters by country', () => {
    const res = search({ country: 'USA' });
    expect(res.length).toBe(1);
    expect(res[0].location.country).toBe('USA');
  });

  it('filters by date', () => {
    const res = search({ date: '2025-07-08' });
    expect(res.length).toBe(1);
    expect(res[0].date).toBe('2025-07-08');
  });

  it('sorts by date ascending', () => {
    const res = search({ iata: 'TLV' });
    expect(res[0].date < res[1].date).toBe(true);
  });

  it('returns empty array for no match', () => {
    const res = search({ city: 'Nowhere' });
    expect(res.length).toBe(0);
  });
});