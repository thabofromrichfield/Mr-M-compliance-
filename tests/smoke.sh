#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${OWNER_EMAIL:-admin@compliance.app}"
PASSWORD="${OWNER_PASSWORD:-Compliance123!}"
SECRET="${SESSION_SECRET:-}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/documents")
[[ "$status" == 401 ]] || { echo "Expected unauthenticated API 401, got $status"; exit 1; }
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/cron/alerts")
[[ "$status" == 403 ]] || { echo "Expected unauthenticated alert scheduler 403, got $status"; exit 1; }
curl -fsS -H 'Content-Type: application/json' -d "$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json,os;print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"]}))')" "$BASE_URL/api/auth/login" > "$TMP/login.json"
TOKEN=$(node -e "process.stdout.write(require('$TMP/login.json').sessionToken||'')")
[[ -n "$TOKEN" ]] || { echo 'No preview token was returned.'; exit 1; }
if [[ -z "$SECRET" ]]; then
  SECRET=$(node -e "const fs=require('node:fs'),os=require('node:os'),path=require('node:path'); process.stdout.write(fs.readFileSync(path.join(os.tmpdir(),'clearledger-demo','session-secret'),'utf8'))")
fi
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-ClearLedger-Session: $TOKEN")
curl -fsS "${AUTH[@]}" "$BASE_URL/api/auth/me" > "$TMP/me.json"
node -e "if(require('$TMP/me.json').user.email!=='$EMAIL')process.exit(1)"

printf 'Operating permit. Expiry date: 25 November 2027. Renewal cost: R 1,850.50. Internal ref: MUST NOT BE EXTRACTED.\n' > "$TMP/permit.txt"
curl -fsS "${AUTH[@]}" -F "file=@$TMP/permit.txt;type=text/plain" -F 'category=Licence' -F 'tags=annual,government' "$BASE_URL/api/documents" > "$TMP/upload.json"
node - "$TMP/upload.json" <<'JS'
const d=require(process.argv[2]).document;
if(d.detectedCost!==1850.5||d.cost!==null) process.exit(1);
if(d.detectedExpiry!=='2027-11-25'||d.expiryDate!==null||d.category!=='Licence'||!d.tags.includes('annual')) process.exit(1);
if(Object.keys(d).some(k=>/text|content|extracted/i.test(k))) process.exit(1);
JS
ID=$(node -e "process.stdout.write(require('$TMP/upload.json').document.id)")
python3 - "$ID" "$TMP/permit.txt" <<'PY'
from pathlib import Path
import sys
import tempfile
blob=Path(tempfile.gettempdir(), 'clearledger-demo', 'files', sys.argv[1] + '.cld').read_bytes()
assert blob.startswith(b'CLD1') and Path(sys.argv[2]).read_bytes() not in blob
PY
status=$(curl -s -H "Authorization: Bearer $TOKEN" -H "X-ClearLedger-Session: $TOKEN" -F "file=@$TMP/permit.txt;type=text/plain" -F 'category=Licence' -F 'tags=annual,government' -o "$TMP/duplicate.json" -w '%{http_code}' "$BASE_URL/api/documents")
[[ "$status" == 409 ]] || { echo "Expected duplicate upload warning 409, got $status"; exit 1; }
node - "$TMP/duplicate.json" "$ID" <<'JS'
const d=require(process.argv[2]);
if(!d.confirmationRequired||!d.duplicateMatches?.some(m=>m.id===process.argv[3]&&m.matchType==='exact-file')) process.exit(1);
JS
curl -fsS "${AUTH[@]}" -F "file=@$TMP/permit.txt;type=text/plain" -F 'category=Licence' -F 'tags=annual,government' -F 'confirmDuplicate=true' "$BASE_URL/api/documents" > "$TMP/duplicate-confirmed.json"
DUP_ID=$(node -e "process.stdout.write(require('$TMP/duplicate-confirmed.json').document.id)")
node -e "if(require('$TMP/duplicate-confirmed.json').duplicateConfirmed!==true)process.exit(1)"
curl -fsS "${AUTH[@]}" -X DELETE "$BASE_URL/api/documents/$DUP_ID" >/dev/null
curl -fsS "${AUTH[@]}" -H 'Content-Type: application/json' -X PATCH -d '{"expiryDate":"2027-11-25","cost":1850.5}' "$BASE_URL/api/documents/$ID" > /dev/null
# Pricing is validated, persisted and clearable without changing expiry.
for INVALID in '-1' '1.001' '"free"' '1000000000'; do
  status=$(curl -s "${AUTH[@]}" -H 'Content-Type: application/json' -X PATCH -d "{\"cost\":$INVALID}" -o /dev/null -w '%{http_code}' "$BASE_URL/api/documents/$ID")
  [[ "$status" == 400 ]] || { echo "Invalid cost accepted: $INVALID"; exit 1; }
done
curl -fsS "${AUTH[@]}" "$BASE_URL/api/documents/$ID" > "$TMP/cost.json"
node -e "if(require('$TMP/cost.json').document.cost!==1850.5)process.exit(1)"
for COST in null 0 1850.5; do
  curl -fsS "${AUTH[@]}" -H 'Content-Type: application/json' -X PATCH -d "{\"cost\":$COST}" "$BASE_URL/api/documents/$ID" > "$TMP/cost.json"
  node -e "const d=require('$TMP/cost.json').document;if(d.cost!==$COST||d.expiryDate!=='2027-11-25')process.exit(1)"
done
curl -fsS "${AUTH[@]}" "$BASE_URL/api/documents/$ID/file" > "$TMP/download.txt"
cmp "$TMP/permit.txt" "$TMP/download.txt"
curl -fsS -D "$TMP/preview.headers" "${AUTH[@]}" "$BASE_URL/api/documents/$ID/file?preview=1" -o "$TMP/preview.txt"
grep -qi '^content-disposition: inline' "$TMP/preview.headers"
cmp "$TMP/permit.txt" "$TMP/preview.txt"

# A signed renewal link needs no session and is rejected when replayed.
TOKEN_RENEW=$(DOC_ID="$ID" SESSION_SECRET="$SECRET" node - <<'JS'
const jwt=require('jsonwebtoken');
process.stdout.write(jwt.sign({doc:process.env.DOC_ID},process.env.SESSION_SECRET,{algorithm:'HS256',issuer:'ClearLedger-renewal',audience:'clearledger-one-click',expiresIn:'1h',jwtid:'smoke-renewal-once'}));
JS
)
curl -fsS -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN_RENEW\",\"expiryDate\":\"2029-11-25\"}" "$BASE_URL/api/renew" > "$TMP/renew.json"
node -e "if(require('$TMP/renew.json').ok!==true||require('$TMP/renew.json').expiryDate!=='2029-11-25')process.exit(1)"
status=$(curl -s -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN_RENEW\",\"expiryDate\":\"2029-11-25\"}" -o "$TMP/replay.json" -w '%{http_code}' "$BASE_URL/api/renew")
[[ "$status" == 409 ]] || { echo "Expected replayed renewal link to return 409, got $status"; exit 1; }
node -e "if(!require('$TMP/replay.json').error.includes('already been used'))process.exit(1)"
curl -fsS "${AUTH[@]}" "$BASE_URL/api/documents/$ID" > "$TMP/renewed.json"
node -e "const d=require('$TMP/renewed.json').document;if(d.expiryDate!=='2029-11-25'||!d.renewedAt)process.exit(1)"
status=$(curl -s "${AUTH[@]}" -H 'Content-Type: application/json' -X PATCH -d '{"markRenewed":true}' -o "$TMP/missing-renewal-date.json" -w '%{http_code}' "$BASE_URL/api/documents/$ID")
[[ "$status" == 400 ]] || { echo "Expected renewal without a new expiry date to return 400, got $status"; exit 1; }
curl -fsS "${AUTH[@]}" -H 'Content-Type: application/json' -X PATCH -d '{"markRenewed":true,"expiryDate":"2032-11-25"}' "$BASE_URL/api/documents/$ID" > "$TMP/manual-renewed.json"
node -e "const d=require('$TMP/manual-renewed.json').document;if(d.expiryDate!=='2032-11-25'||!d.renewedAt)process.exit(1)"

curl -fsS "${AUTH[@]}" -H 'Content-Type: application/json' -d '{"setup":true}' "$BASE_URL/api/auth/totp" > "$TMP/totp.json"
node -e "const d=require('$TMP/totp.json');if(!d.qr.startsWith('data:image/')||!d.secret)process.exit(1)"
curl -fsS "${AUTH[@]}" "$BASE_URL/api/audit" > "$TMP/audit.json"
node -e "if(!require('$TMP/audit.json').logs.length)process.exit(1)"
curl -fsS "${AUTH[@]}" "$BASE_URL/api/export" -o "$TMP/backup.zip"
unzip -t "$TMP/backup.zip" >/dev/null
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/register")
[[ "$status" == 404 ]] || { echo "Registration route should not exist (got $status)."; exit 1; }
curl -fsS "${AUTH[@]}" -X DELETE "$BASE_URL/api/documents/$ID" >/dev/null
curl -fsS "${AUTH[@]}" -X POST "$BASE_URL/api/auth/logout" >/dev/null
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/me")
[[ "$status" == 401 ]] || { echo "Expected 401 after logout, got $status"; exit 1; }
echo 'Smoke passed: auth, expiry-only scan, duplicate warning and override, confirmation, encrypted preview/download, variable-term no-login renewal, TOTP setup, audit, ZIP, logout, registration disabled.'
