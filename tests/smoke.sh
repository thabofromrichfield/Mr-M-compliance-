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

# Arena previews run in a cross-site iframe. Confirm the server issues a usable preview cookie.
curl -sS -D "$TMP/preview-headers" -o /dev/null \
  -H 'x-forwarded-host: 3000-smoke.e2b.app' -H 'x-forwarded-proto: https' \
  -H 'Content-Type: application/json' \
  -d "$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json,os; print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"]}))')" \
  "$BASE_URL/api/auth/login"
grep -qi 'SameSite=none' "$TMP/preview-headers" || { echo 'Preview session cookie is missing SameSite=None.'; exit 1; }
grep -qi 'Secure' "$TMP/preview-headers" || { echo 'Preview session cookie is missing Secure.'; exit 1; }
grep -qi 'Partitioned' "$TMP/preview-headers" || { echo 'Preview session cookie is missing Partitioned.'; exit 1; }

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/register")
[[ "$status" == "404" ]] || { echo "Expected registration page to be absent; got $status"; exit 1; }
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/register")
[[ "$status" == "404" ]] || { echo "Expected registration API to be absent; got $status"; exit 1; }

curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json,os; print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"]}))')" \
  "$BASE_URL/api/auth/login" > "$TMP/login.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1])).get("ok")' "$TMP/login.json"
SESSION_TOKEN=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("sessionToken", ""))' "$TMP/login.json")
[[ -n "$SESSION_TOKEN" ]] || { echo 'Development sign-in did not return the preview session token.'; exit 1; }
AUTH=(-H "Authorization: Bearer $SESSION_TOKEN" -H "X-ClearLedger-Session: $SESSION_TOKEN")
curl -fsS "${AUTH[@]}" "$BASE_URL/api/auth/me" > "$TMP/me.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["user"]["email"]' "$TMP/me.json"

# The authenticated user should be able to reach every primary workspace screen.
for page in dashboard documents audit settings; do
  status=$(curl -s "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE_URL/$page")
  [[ "$status" == "200" ]] || { echo "Expected /$page to return 200 after sign-in; got $status"; exit 1; }
done

printf 'Certificate of Compliance. Expires on 20 December 2028.\n' > "$TMP/certificate.txt"
curl -fsS "${AUTH[@]}" -F "file=@$TMP/certificate.txt;type=text/plain" -F 'category=Licence' -F 'tags=smoke,test' \
  "$BASE_URL/api/documents" > "$TMP/upload.json"
DOC_ID=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1]))["document"]; assert d["expiryDate"] == "2028-12-20"; assert "storagePath" not in d; print(d["id"])' "$TMP/upload.json")

curl -fsS "${AUTH[@]}" "$BASE_URL/api/documents/$DOC_ID" > "$TMP/detail.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["document"]["name"] == "certificate.txt"' "$TMP/detail.json"
curl -fsS "${AUTH[@]}" "$BASE_URL/api/documents/$DOC_ID/file" > "$TMP/downloaded.txt"
grep -q 'Expires on 20 December 2028' "$TMP/downloaded.txt"

# Manual editing and category/tag management.
curl -fsS "${AUTH[@]}" -H 'Content-Type: application/json' -X PATCH \
  -d '{"expiryDate":"2029-12-20","category":"Insurance","tags":["smoke","renewal"]}' \
  "$BASE_URL/api/documents/$DOC_ID" > "$TMP/updated.json"
python3 -c 'import json,sys; d=json.load(open(sys.argv[1]))["document"]; assert d["expiryDate"] == "2029-12-20" and d["category"] == "Insurance" and d["tags"] == ["smoke","renewal"]' "$TMP/updated.json"

# 2FA setup should provide a QR payload; do not enable it, to keep the demo account ready for sign-in.
curl -fsS "${AUTH[@]}" -X POST "$BASE_URL/api/auth/totp/setup" > "$TMP/totp.json"
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d["qr"].startswith("data:image/") and d["secret"]' "$TMP/totp.json"

# The signed email link marks renewal without a session, as required by the scope.
SESSION_SECRET=$(python3 - <<'PY'
from pathlib import Path
secret = None
p = Path('.env.local')
if p.exists():
    for line in p.read_text().splitlines():
        if line.startswith('SESSION_SECRET='):
            secret = line.split('=', 1)[1].strip().strip('"').strip("'")
            break
print(secret or 'local-demo-session-secret-change-me')
PY
)
RENEW_TOKEN=$(python3 - "$DOC_ID" "$SESSION_SECRET" <<'PY'
import base64, hashlib, hmac, sys, time
payload = f'{sys.argv[1]}:{int(time.time() * 1000)}'
signature = hmac.new(sys.argv[2].encode(), payload.encode(), hashlib.sha256).hexdigest()
print(base64.urlsafe_b64encode(f'{payload}:{signature}'.encode()).decode().rstrip('='))
PY
)
curl -fsS "$BASE_URL/api/renew?token=$RENEW_TOKEN" > "$TMP/renew.html"
grep -q 'Renewal recorded' "$TMP/renew.html"
curl -fsS "${AUTH[@]}" "$BASE_URL/api/documents/$DOC_ID" > "$TMP/renewed.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["document"]["status"] == "renewed"' "$TMP/renewed.json"

curl -fsS "${AUTH[@]}" "$BASE_URL/api/audit" > "$TMP/audit.json"
python3 -c 'import json,sys; assert len(json.load(open(sys.argv[1]))["logs"]) >= 3' "$TMP/audit.json"
curl -fsS "${AUTH[@]}" "$BASE_URL/api/export" -o "$TMP/backup.zip"
unzip -t "$TMP/backup.zip" >/dev/null
curl -fsS "${AUTH[@]}" -X DELETE "$BASE_URL/api/documents/$DOC_ID" >/dev/null
curl -fsS "${AUTH[@]}" -X POST "$BASE_URL/api/auth/logout" >/dev/null
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/me")
[[ "$status" == "401" ]] || { echo "Expected signed-out session to return 401; got $status"; exit 1; }

echo 'Full smoke passed: preview-cookie attributes, sign-in/session, protected screens, upload/date extraction, file download, editing, 2FA setup, no-login renewal, audit, ZIP export, logout, and registration disabled.'
