db = db.getSiblingDB("sta");

// Users (with fullName and bcrypt hashes for demonstration)
db.users.insertMany([
  {
    _id: "u1",
    email: "alice@example.com",
    fullName: "Alice Example",
    passwordHash: "$2b$12$KIXQ4Q1rQw1Qw1Qw1Qw1QeQw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Q", // bcrypt for "password"
    roles: ["user"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "admin1",
    email: "admin@example.com",
    fullName: "Admin User",
    passwordHash: "$2b$12$KIXQ4Q1rQw1Qw1Qw1Qw1QeQw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Q", // bcrypt for "adminpass"
    roles: ["admin"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Trips
db.trips.insertMany([
  { _id: "t1", userId: "u1", status: "planned", createdAt: new Date(), updatedAt: new Date() },
  { _id: "t2", userId: "admin1", status: "confirmed", createdAt: new Date(), updatedAt: new Date() }
]);

// Flight Bookings
db.flight_bookings.insertMany([
  {
    _id: "fb1",
    tripId: "t1",
    flightId: "f1",
    seatClass: "economy",
    departureTime: ISODate("2025-07-10T14:30:00Z"),
    price: 450,
    status: "ticketed",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "fb2",
    tripId: "t2",
    flightId: "f2",
    seatClass: "business",
    departureTime: ISODate("2025-07-20T09:00:00Z"),
    price: 900,
    status: "reserved",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Hotel Bookings
db.hotel_bookings.insertMany([
  {
    _id: "hb1",
    tripId: "t1",
    hotelId: "h2",
    checkIn: ISODate("2025-07-10"),
    checkOut: ISODate("2025-07-20"),
    rooms: 1,
    price: 1500,
    status: "reserved",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "hb2",
    tripId: "t2",
    hotelId: "h1",
    checkIn: ISODate("2025-07-20"),
    checkOut: ISODate("2025-07-25"),
    rooms: 2,
    price: 2000,
    status: "checked-in",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);