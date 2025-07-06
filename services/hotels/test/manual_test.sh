#!/bin/bash
# Manual test script for Hotels Service (mirrors Flights manual_test.sh)

BASE_URL="http://localhost:4001"

echo "== Healthz =="
curl -s $BASE_URL/healthz | jq

echo "== List Hotels =="
curl -s "$BASE_URL/hotels?city=Paris" | jq

echo "== Hotel Details =="
curl -s "$BASE_URL/hotels/1" | jq

echo "== Book Hotel (JWT required, not implemented in this script) =="
# curl -s -X POST $BASE_URL/bookings -H "Authorization: Bearer <token>" -d '{"hotelId":"1","roomType":"deluxe","checkIn":"2025-07-10","checkOut":"2025-07-12"}' | jq

echo "== List Bookings (JWT required) =="
# curl -s -H "Authorization: Bearer <token>" $BASE_URL/bookings | jq

echo "== Cancel Booking (JWT required) =="
# curl -s -X POST -H "Authorization: Bearer <token>" $BASE_URL/bookings/<bookingId>/cancel | jq