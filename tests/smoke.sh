#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${DEFAULT_EMAIL:-admin@compliance.app}"
PASSWORD="${DEFAULT_PASSWORD:-Compliance123!}"
TMP="$(mktemp -d)"
COOKIE_JAR="$TMP/cookies.txt"
trap 'rm -rf "$TMP"' EXIT

status=$(curl -s -o "$TMP/unauth.json" -w '%{http_code}' "$BASE_URL/api/documents")
[[ "$status" == "401" ]] || { echo "Expected unauthenticated documents API to return 401; got $status"; exit 1; }

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/register")
[[ "$status" == "404" ]] || { echo "Expected registration page to be absent; got $status"; exit 1; }
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/register")
[[ "$status" == "404" ]] || { echo "Expected registration API to be absent; got $status"; exit 1; }

curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json,os; print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"]}))')" \
  "$BASE_URL/api/auth/login" > "$TMP/login.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1])).get("ok")' "$TMP/login.json"
curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/auth/me" > "$TMP/me.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["user"]["email"]' "$TMP/me.json"

printf 'Certificate of Compliance. Expires on 20 December 2028.\n' > "$TMP/certificate.txt"
curl -fsS -b "$COOKIE_JAR" -F "file=@$TMP/certificate.txt;type=text/plain" -F 'category=Licence' -F 'tags=smoke,test' \
  "$BASE_URL/api/documents" > "$TMP/upload.json"
DOC_ID=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1]))["document"]; assert d["expiryDate"] == "2028-12-20"; assert "storagePath" not in d; print(d["id"])' "$TMP/upload.json")

curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' -X PATCH \
  -d '{"renewed":true}' "$BASE_URL/api/documents/$DOC_ID" > "$TMP/renew.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["document"]["status"] == "renewed"' "$TMP/renew.json"

curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/export" -o "$TMP/backup.zip"
unzip -t "$TMP/backup.zip" >/dev/null
curl -fsS -b "$COOKIE_JAR" -X DELETE "$BASE_URL/api/documents/$DOC_ID" >/dev/null
curl -fsS -b "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/logout" >/dev/null

echo 'Smoke checks passed: auth-only access, registration disabled, expiry extraction, one-owner workflow, renewal, export.'
