#!/usr/bin/env bash
set -euo pipefail

# === Config ===
AUTH_BASE="http://localhost:4003/auth"
WEATHER_BASE="http://localhost:4000"
EMAIL="john.doe@example.com"
PASSWORD="P@ssw0rd123"

# === 1. Login and get JWT ===
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$AUTH_BASE/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')

echo "TOKEN=$TOKEN"
echo

# === 2. Search weather (Tokyo) ===
echo "Searching weather in Tokyo..."
WEATHER_JSON=$(curl -s -G "$WEATHER_BASE/weather" \
  -d city=Tokyo \
  -H "Authorization: Bearer $TOKEN")

echo "$WEATHER_JSON" | jq .
echo

# === 3. Pick first snapshot props ===
WID=$(echo "$WEATHER_JSON" | jq -r '.[0].weather_id')
DATE=$(echo "$WEATHER_JSON" | jq -r '.[0].date')
echo "Selected weather_id: $WID  (date=$DATE)"
echo

# === 4. Filter again by the same date & city ===
echo "Retrieving snapshots for Tokyo on $DATE..."
curl -s -G "$WEATHER_BASE/weather" \
  -d city=Tokyo -d date="$DATE" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo

# === 5. Health check ===
echo "Health check..."
curl -s "$WEATHER_BASE/healthz" | jq .
echo

# === 6. Metrics (optional) ===
echo "Metrics line count:"
curl -s "$WEATHER_BASE/metrics" | wc -l