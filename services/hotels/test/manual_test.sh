#!/usr/bin/env bash
set -euo pipefail

# === Config ===
AUTH_BASE="http://localhost:4003/auth"
HOTELS_BASE="http://localhost:4001"
EMAIL="john.doe@example.com"
PASSWORD="P@ssw0rd123"

# === 1. Login and get JWT ===
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$AUTH_BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}' | jq -r '.token')

echo "TOKEN=$TOKEN"
echo

# === 2. Search hotels ===
echo "Searching hotels in London..."
HOTELS_JSON=$(curl -s -G "$HOTELS_BASE/hotels" \
  -d city=Tokyo \
  -H "Authorization: Bearer $TOKEN")

echo "$HOTELS_JSON" | jq .
echo

# extract first hotel_id
HID=$(echo "$HOTELS_JSON" | jq -r '.data[0].hotel_id')
echo "Selected hotel ID: $HID"
echo

# === 3. Hotel details ===
echo "Retrieving hotel details..."
curl -s "$HOTELS_BASE/hotels/$HID" -H "Authorization: Bearer $TOKEN" | jq .
echo

# === 4. Book the hotel ===
echo "Creating booking..."
BOOKING_JSON=$(curl -s -X POST "$HOTELS_BASE/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"hotelId":"'"$HID"'", "roomType":"Double", "checkIn":"2025-07-10", "checkOut":"2025-07-12"}')

echo "$BOOKING_JSON" | jq .
echo

BID=$(echo "$BOOKING_JSON" | jq -r '.data._id')
echo "Booking ID: $BID"
echo

# === 5. List bookings ===
echo "Listing bookings..."
curl -s "$HOTELS_BASE/bookings" -H "Authorization: Bearer $TOKEN" | jq .
echo

# === 6. Cancel booking ===
echo "Cancelling booking..."
curl -s -X POST "$HOTELS_BASE/bookings/$BID/cancel" -H "Authorization: Bearer $TOKEN"
echo -e "\nBooking cancelled."
echo

# === 7. Health check ===
echo "Health check..."
curl -s "$HOTELS_BASE/healthz" | jq .