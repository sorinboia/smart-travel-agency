// ESM version of flight search filter tests

import { search, __setTestFlights__ } from '../../src/models/flightCatalogue.js';

describe('Flight search filtering', () => {
  const flights = [
    {
      flight_id: 'f1',
      origin: { iata: 'TLV' },
      destination: { iata: 'JFK' },
      departure_utc: '2025-07-10T08:00:00Z',
      duration_min: 600,
      class_fares: [
        { class: 'Economy', seats_left: 2, price: { amount: 500 } },
        { class: 'Business', seats_left: 0, price: { amount: 1200 } }
      ]
    },
    {
      flight_id: 'f2',
      origin: { iata: 'TLV' },
      destination: { iata: 'JFK' },
      departure_utc: '2025-07-10T12:00:00Z',
      duration_min: 620,
      class_fares: [
        { class: 'Economy', seats_left: 0, price: { amount: 450 } },
        { class: 'Business', seats_left: 1, price: { amount: 1100 } }
      ]
    }
  ];

  beforeAll(() => {
    // Patch the in-memory flights for testing
    __setTestFlights__(flights);
  });

  it('filters by origin and destination', () => {
    const results = search({ origin: 'TLV', destination: 'JFK' });
    expect(results.length).toBe(2);
  });

  it('filters by class with available seats', () => {
    const results = search({ origin: 'TLV', destination: 'JFK', class: 'Economy' });
    expect(results.length).toBe(1);
    expect(results[0].flight_id).toBe('f1');
  });

  it('returns empty if no seats left in class', () => {
    const results = search({ origin: 'TLV', destination: 'JFK', class: 'First' });
    expect(results.length).toBe(0);
  });
});