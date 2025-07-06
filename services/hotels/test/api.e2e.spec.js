// Jest + Supertest e2e tests for Hotels Service
// This is a placeholder. Actual tests should mirror Flights e2e, adapted for hotels endpoints.

describe('Hotels Service API', () => {
  it('should load hotels catalogue and respond to /hotels', async () => {
    // TODO: Implement e2e test for GET /hotels
  });

  it('should allow booking a hotel room', async () => {
    // TODO: Implement e2e test for POST /bookings
  it('should allow booking the same hotel/roomType repeatedly (no availability check)', async () => {
    // This is a placeholder for a real test. Pseudocode:
    // 1. Book the same hotel/roomType twice with different users or same user.
    // 2. Both bookings should succeed (status 200, no 409 error).
    // 3. Optionally, check that both bookings exist in the database.
    // Example (using supertest, assuming app is your Fastify instance):
    // const res1 = await request(app)
    //   .post('/bookings')
    //   .send({ hotelId: 'demo-hotel', roomType: 'standard', checkIn: '2025-07-10', checkOut: '2025-07-12' })
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res1.status).toBe(200);
    // const res2 = await request(app)
    //   .post('/bookings')
    //   .send({ hotelId: 'demo-hotel', roomType: 'standard', checkIn: '2025-07-10', checkOut: '2025-07-12' })
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res2.status).toBe(200);
  });
  });

  it('should list user hotel bookings', async () => {
    // TODO: Implement e2e test for GET /bookings
  });

  it('should cancel a hotel booking', async () => {
    // TODO: Implement e2e test for POST /bookings/:id/cancel
  });
});