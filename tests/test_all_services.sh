#!/usr/bin/env bash
set -euo pipefail

# === Config ===
AUTH_BASE="${AUTH_BASE:-http://localhost:4003/auth}"
FLIGHTS_BASE="${FLIGHTS_BASE:-http://localhost:4002}"
HOTELS_BASE="${HOTELS_BASE:-http://localhost:4001}"
WEATHER_BASE="${WEATHER_BASE:-http://localhost:4006}"
TRIPS_BASE="${TRIPS_BASE:-http://localhost:4010}"
EMAIL="${EMAIL:-john.doe@example.com}"
PASSWORD="${PASSWORD:-P@ssw0rd123}"

# === Helpers ===
color() { tput setaf "$1"; }
reset() { tput sgr0; }
section() { color 4; echo -e "\n==== $1 ===="; reset; }
success() { color 2; echo -e "$1"; reset; }
fail() { color 1; echo -e "$1"; reset; }

command -v jq >/dev/null 2>&1 || { fail "jq is required but not installed."; exit 1; }

# === 1. Login and get JWT ===
section "Authenticating"
TOKEN=$(curl -s -X POST "$AUTH_BASE/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  fail "Failed to authenticate."
  exit 1
fi
echo "TOKEN=$TOKEN"

# === 2. Flights Service ===
section "Flights Service"
echo "Searching flights JFK → LHR..."
FLIGHTS_JSON=$(curl -s -G "$FLIGHTS_BASE/flights" \
  -d origin=JFK -d destination=LHR \
  -H "Authorization: Bearer $TOKEN")
echo "$FLIGHTS_JSON" | jq .
FID=$(echo "$FLIGHTS_JSON" | jq -r '.flights[0].flight_id')
if [[ -z "$FID" || "$FID" == "null" ]]; then fail "No flight found."; exit 1; fi
echo "Selected flight ID: $FID"

echo "Retrieving flight details..."
curl -s "$FLIGHTS_BASE/flights/$FID" -H "Authorization: Bearer $TOKEN" | jq .

echo "Creating flight booking..."
BOOKING_JSON=$(curl -s -X POST "$FLIGHTS_BASE/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"flightId\":\"$FID\", \"class\":\"Economy\"}")
echo "$BOOKING_JSON" | jq .
BID=$(echo "$BOOKING_JSON" | jq -r '._id')
if [[ -z "$BID" || "$BID" == "null" ]]; then fail "No booking created."; exit 1; fi
echo "Booking ID: $BID"

echo "Listing bookings..."
curl -s "$FLIGHTS_BASE/bookings" -H "Authorization: Bearer $TOKEN" | jq .

echo "Cancelling booking..."
curl -s -X DELETE "$FLIGHTS_BASE/bookings/$BID" -H "Authorization: Bearer $TOKEN"
echo -e "\nBooking cancelled."

echo "Flights health check..."
curl -s "$FLIGHTS_BASE/healthz" | jq .

# === 3. Hotels Service ===
section "Hotels Service"
echo "Searching hotels in Tokyo..."
HOTELS_JSON=$(curl -s -G "$HOTELS_BASE/hotels" \
  -d city=Tokyo \
  -H "Authorization: Bearer $TOKEN")
echo "$HOTELS_JSON" | jq .
HID=$(echo "$HOTELS_JSON" | jq -r '.data[0].hotel_id')
if [[ -z "$HID" || "$HID" == "null" ]]; then fail "No hotel found."; exit 1; fi
echo "Selected hotel ID: $HID"

echo "Retrieving hotel details..."
curl -s "$HOTELS_BASE/hotels/$HID" -H "Authorization: Bearer $TOKEN" | jq .

echo "Creating hotel booking..."
HOTEL_BOOKING_JSON=$(curl -s -X POST "$HOTELS_BASE/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"hotelId\":\"$HID\", \"roomType\":\"Double\", \"checkIn\":\"2025-07-10\", \"checkOut\":\"2025-07-12\"}")
echo "$HOTEL_BOOKING_JSON" | jq .
HBID=$(echo "$HOTEL_BOOKING_JSON" | jq -r '.data._id')
if [[ -z "$HBID" || "$HBID" == "null" ]]; then fail "No hotel booking created."; exit 1; fi
echo "Hotel Booking ID: $HBID"

echo "Listing hotel bookings..."
curl -s "$HOTELS_BASE/bookings" -H "Authorization: Bearer $TOKEN" | jq .

echo "Cancelling hotel booking..."
curl -s -X POST "$HOTELS_BASE/bookings/$HBID/cancel" -H "Authorization: Bearer $TOKEN"
echo -e "\nBooking cancelled."

echo "Hotels health check..."
curl -s "$HOTELS_BASE/healthz" | jq .

# === 4. Weather Service ===
section "Weather Service"
echo "Searching weather in Tokyo..."
WEATHER_JSON=$(curl -s -G "$WEATHER_BASE/weather" \
  -d city=Tokyo \
  -H "Authorization: Bearer $TOKEN")
echo "$WEATHER_JSON" | jq .
WID=$(echo "$WEATHER_JSON" | jq -r '.[0].weather_id')
DATE=$(echo "$WEATHER_JSON" | jq -r '.[0].date')
if [[ -z "$WID" || "$WID" == "null" ]]; then fail "No weather data found."; exit 1; fi
echo "Selected weather_id: $WID  (date=$DATE)"

echo "Retrieving weather snapshots for Tokyo on $DATE..."
curl -s -G "$WEATHER_BASE/weather" \
  -d city=Tokyo -d date="$DATE" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "Weather health check..."
curl -s "$WEATHER_BASE/healthz" | jq .

echo "Weather metrics line count:"
curl -s "$WEATHER_BASE/metrics" | wc -l

# === 5. Trips Service ===
section "Trips Service"
echo "Creating trip plan..."
TRIP_JSON=$(curl -s -X POST "$TRIPS_BASE/trips" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Unified Test Trip\",\"flightBookingIds\":[\"$BID\"],\"hotelBookingIds\":[\"$HBID\"]}")
echo "$TRIP_JSON" | jq .
TID=$(echo "$TRIP_JSON" | jq -r '.data._id')
if [[ -z "$TID" || "$TID" == "null" ]]; then fail "No trip created."; exit 1; fi
echo "Trip ID: $TID"

echo "Listing trips..."
curl -s "$TRIPS_BASE/trips" -H "Authorization: Bearer $TOKEN" | jq .

echo "Retrieving trip details..."
curl -s "$TRIPS_BASE/trips/$TID" -H "Authorization: Bearer $TOKEN" | jq .

echo "Deleting trip..."
curl -s -X DELETE "$TRIPS_BASE/trips/$TID" -H "Authorization: Bearer $TOKEN"
echo -e "\nTrip deleted."

echo "Trips health check..."
curl -s "$TRIPS_BASE/healthz" | jq .

success "\n✅ All services tested successfully."