# MongoDB Design for Smart Travel Agency

## Overview

This document describes the MongoDB schema and design rationale for the Smart Travel Agency application. The design separates flight and hotel bookings, while allowing correlation of bookings that are part of the same planned trip.

---

## Collections

### 1. users

Stores user account information for authentication and registration.

Example:
```json
{
  "_id": "u1",
  "email": "alice@example.com",
  "fullName": "Alice Example",
  "passwordHash": "$2b$12$examplehashstring",
  "roles": ["user"],
  "status": "active",
  "createdAt": "2025-07-01T10:00:00Z",
  "updatedAt": "2025-07-01T10:00:00Z"
}
```

**Fields:**
- `_id`: string, unique user identifier (UUID or similar)
- `email`: string, unique, used for login (lowercase)
- `fullName`: string, user's full name
- `passwordHash`: string, bcrypt/argon2 hash of password
- `roles`: array of strings, e.g. `["user"]`, `["admin"]`
- `status`: string, e.g. `"active"`, `"pending-verify"`, `"disabled"`
- `createdAt`, `updatedAt`: ISO date strings

**Optional security fields:**
- `emailVerified`: boolean
- `verifyToken`: string (for email verification)
- `resetToken`: string (for password reset)
- `resetExpires`: date
- `failedLogins`: number (for lockout/throttling)
- `lastLogin`: date

**Indexing:**
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
```

---

### 2. trips

Represents a planned or completed trip, grouping together related bookings.

Example:
```json
{
  "_id": "t1",
  "userId": "u1",
  "status": "planned",
  "createdAt": "2025-07-01T10:00:00Z",
  "updatedAt": "2025-07-01T10:00:00Z"
}
```

---

### 3. flight_bookings

Stores individual flight bookings, each linked to a trip.

Example:
```json
{
  "_id": "fb1",
  "tripId": "t1",
  "flightId": "f1",
  "seatClass": "economy",
  "departureTime": "2025-07-10T14:30:00Z",
  "price": 450,
  "status": "ticketed",
  "createdAt": "2025-07-01T10:00:00Z",
  "updatedAt": "2025-07-01T10:00:00Z"
}
```

---

### 4. hotel_bookings

Stores individual hotel bookings, each linked to a trip.

Example:
```json
{
  "_id": "hb1",
  "tripId": "t1",
  "hotelId": "h2",
  "checkIn": "2025-07-10",
  "checkOut": "2025-07-20",
  "rooms": 1,
  "price": 1500,
  "status": "reserved",
  "createdAt": "2025-07-01T10:00:00Z",
  "updatedAt": "2025-07-01T10:00:00Z"
}
```

---

## Relationships

- Each `trip` is associated with a `user` via `userId`.
- Each `flight_booking` and `hotel_booking` is associated with a `trip` via `tripId`.
- This allows grouping multiple bookings (flights, hotels) under a single trip for correlation and reporting.

---

## Query Example

To fetch a trip and all its related bookings:

```javascript
db.trips.aggregate([
  { $match: { _id: "t1" } },
  { $lookup: {
      from: "flight_bookings",
      localField: "_id",
      foreignField: "tripId",
      as: "flights"
  }},
  { $lookup: {
      from: "hotel_bookings",
      localField: "_id",
      foreignField: "tripId",
      as: "hotels"
  }}
]);
```

---

## Rationale

- **Separation of concerns:** Bookings for flights and hotels are managed independently, allowing for flexible modifications and cancellations.
- **Correlation:** The `tripId` field enables grouping and reporting on all bookings that are part of the same travel plan.
- **Extensibility:** Additional booking types (e.g., car rentals) can be added with the same pattern.

---

## Notes

- Collections for flights and hotels themselves (the catalog) may be stored in MinIO or MongoDB, depending on application needs.
- Only dynamic, user-specific data (bookings, trips) must be in MongoDB for transactional and query support.

- The `users` collection is designed to support secure authentication, registration, and account management, including full name and password hashing.
