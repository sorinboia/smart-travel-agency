#!/usr/bin/env bash
set -euo pipefail

# === Config ===
AUTH_BASE="http://localhost:4003/auth"
TRIPS_BASE="http://localhost:4010"
EMAIL="john.doe@example.com"
PASSWORD="P@ssw0rd123"

# === 1. Login and get JWT ===
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$AUTH_BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}' | jq -r '.token')

echo "TOKEN=$TOKEN"
echo

# === 2. Create a trip plan ===
echo "Creating trip plan..."
TRIP_JSON=$(curl -s -X POST "$TRIPS_BASE/trips" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Japan Adventure","flightBookingIds":["F001","F002"],"hotelBookingIds":["H123"]}')

echo "$TRIP_JSON" | jq .
echo

TID=$(echo "$TRIP_JSON" | jq -r '.data._id')
echo "Trip ID: $TID"
echo

# === 3. List trips ===
echo "Listing trips..."
curl -s "$TRIPS_BASE/trips" -H "Authorization: Bearer $TOKEN" | jq .
echo

# === 4. Trip details ===
echo "Retrieving trip details..."
curl -s "$TRIPS_BASE/trips/$TID" -H "Authorization: Bearer $TOKEN" | jq .
echo

# === 5. Delete trip ===
echo "Deleting trip..."
curl -s -X DELETE "$TRIPS_BASE/trips/$TID" -H "Authorization: Bearer $TOKEN"
echo -e "\nTrip deleted."
echo

# === 6. Health check ===
echo "Health check..."
curl -s "$TRIPS_BASE/healthz" | jq .