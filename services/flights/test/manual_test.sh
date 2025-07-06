#!/usr/bin/env bash
set -euo pipefail

# === Config ===
AUTH_BASE="http://localhost:4003/auth"
FLIGHTS_BASE="http://localhost:4002"
EMAIL="john.doe@example.com"
PASSWORD="P@ssw0rd123"

# === 1. Login and get JWT ===
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$AUTH_BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}' | jq -r '.token')

echo "TOKEN=$TOKEN"

# === 2. Search flights ===
echo "Searching flights..."
FLIGHTS_JSON=$(curl -s -G "$FLIGHTS_BASE/flights" \
  -d origin=JFK -d destination=LHR  \
  -H "Authorization: Bearer $TOKEN")

echo "$FLIGHTS_JSON" | jq .

# extract first flightId
FID=$(echo "$FLIGHTS_JSON" | jq -r '.flights[0].flight_id')
echo "Selected flight ID: $FID"

# === 3. Flight details ===
echo "Retrieving flight details..."
curl -s "$FLIGHTS_BASE/flights/$FID" -H "Authorization: Bearer $TOKEN" | jq .

# === 4. Book the flight ===
echo "Creating booking..."
BOOKING_JSON=$(curl -s -X POST "$FLIGHTS_BASE/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flightId":"'"$FID"'", "class":"Economy"}')

echo "$BOOKING_JSON" | jq .

BID=$(echo "$BOOKING_JSON" | jq -r '._id')
echo "Booking ID: $BID"

# === 5. List bookings ===
echo "Listing bookings..."
curl -s "$FLIGHTS_BASE/bookings" -H "Authorization: Bearer $TOKEN" | jq .

# === 6. Cancel booking ===
echo "Cancelling booking..."
curl -s -X DELETE "$FLIGHTS_BASE/bookings/$BID" -H "Authorization: Bearer $TOKEN"
echo -e "\nBooking cancelled."

# === 7. Health check (optional) ===
echo "Health check..."
curl -s "$FLIGHTS_BASE/healthz" | jq .