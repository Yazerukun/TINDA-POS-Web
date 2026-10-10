#!/usr/bin/env bash
# End-to-end check of the /api security boundary against a deployed build.
#
#   BASE=https://tindapos-web.pages.dev ./scripts/api-test.sh
#
# Uses a scratch account. Verifies that unauthenticated reads are rejected, that
# PINs and hashes are never returned, that privilege cannot be self-assigned, and
# that a cashier cannot reach another store or the master-only views.

set -uo pipefail
BASE="${BASE:-https://tindapos-web.pages.dev}"
PASS=0
FAIL=0

ok()   { printf '  ok   %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  FAIL %s\n' "$1"; FAIL=$((FAIL+1)); }
check() { # check <label> <expected-status> <method> <path> [json] [auth]
  local label="$1" want="$2" method="$3" path="$4" body="${5:-}" token="${6:-}"
  local args=(-s -o /tmp/opencode/api-body.json -w '%{http_code}' -X "$method" "$BASE$path")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi
  local got
  got=$(curl "${args[@]}")
  if [[ "$got" == "$want" ]]; then ok "$label ($got)"; else
    bad "$label — expected $want, got $got: $(head -c 200 /tmp/opencode/api-body.json)"
  fi
}

SUFFIX=$RANDOM$RANDOM
U="apitest_$SUFFIX"
PIN="4821"

echo "== unauthenticated reads must be rejected =="
check 'GET /api/users'          401 GET
check 'GET /api/pro'            401 GET
check 'GET /api/pro?username=x' 401 GET
check 'POST /api/heartbeat'     401 POST '' '{}'
check 'GET /api/users?username=x' 401 GET

echo
echo "== login =="
check 'bad PIN is rejected'     401 POST /api/login "{\"username\":\"$U\",\"pin\":\"0000\"}"
check 'unknown user is rejected' 401 POST /api/login '{"username":"nobody_at_all_xyz","pin":"4821"}'

SIGNUP=$(curl -s -X POST "$BASE/api/users" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$U\",\"name\":\"API Test\",\"pin\":\"$PIN\",\"status\":\"ACTIVE\",\"created_at\":\"$(date -u +%FT%TZ)\",\"store_name\":\"apitest_$SUFFIX\"}")
if [[ "$SIGNUP" == *'"ok":true'* ]]; then ok "signup accepted"; else bad "signup: $SIGNUP"; fi

LOGIN=$(curl -s -X POST "$BASE/api/login" -H 'Content-Type: application/json' -d "{\"username\":\"$U\",\"pin\":\"$PIN\"}")
TOKEN=$(printf '%s' "$LOGIN" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))' 2>/dev/null)
if [[ -n "$TOKEN" ]]; then ok "login minted a token"; else bad "login: $LOGIN"; fi

echo
echo "== authenticated reads stay scoped to the caller =="
check 'own pro state'           200 GET "/api/pro?username=$U" '' "$TOKEN"
check 'another user pro state'  403 GET '/api/pro?username=admin' '' "$TOKEN"
check 'whole-platform pro list' 403 GET /api/pro '' "$TOKEN"
check 'whole-platform user list' 403 GET /api/users '' "$TOKEN"
check 'other store roster'      403 GET '/api/users?store_name=PLATFORM_HQ' '' "$TOKEN"

echo
echo "== privilege cannot be self-assigned =="
ESC=$(curl -s -X POST "$BASE/api/users" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d "{\"username\":\"$U\",\"name\":\"Escalated\",\"pin\":\"$PIN\",\"status\":\"ACTIVE\",\"role\":\"ADMIN\",\"is_owner\":true,\"created_at\":\"$(date -u +%FT%TZ)\"}")
if [[ "$ESC" == *'"error":"Username already taken"'* ]]; then
  ok 'signup cannot hijack an existing account'
else bad "escalation attempt: $ESC"; fi

SELF=$(curl -s -X POST "$BASE/api/pro" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d "{\"username\":\"$U\",\"pro_expires_at\":$(( $(date +%s) + 8640000 )),\"tokens\":999,\"owner_bypass\":true,\"total_ads_watched\":0,\"last_ad_watched_at\":0}")
STATE=$(curl -s "$BASE/api/pro?username=$U" -H "Authorization: Bearer $TOKEN")
if [[ "$STATE" == *'"owner_bypass":0'* ]]; then ok 'owner_bypass stays server-owned'; else bad "owner_bypass: $STATE"; fi
if [[ "$STATE" == *'"pro_expires_at":0'* ]]; then ok 'cashier cannot mint pro access'; else bad "self pro grant: $STATE"; fi

echo
echo "== no credential material in any response =="
for path in "/api/users?username=$U" "/api/pro?username=$U"; do
  BODY=$(curl -s "$BASE$path" -H "Authorization: Bearer $TOKEN")
  for field in '"pin"' 'pin_hash' 'pin_salt'; do
    if [[ "$BODY" == *"$field"* ]]; then bad "$path leaks $field"; else ok "$path omits $field"; fi
  done
done

echo
echo "== cross-origin requests are refused =="
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/login" \
  -H 'Origin: https://evil.example' -H 'Content-Type: application/json' \
  -d "{\"username\":\"$U\",\"pin\":\"$PIN\"}")
if [[ "$code" == "401" ]]; then ok "cross-origin login refused ($code)"; else bad "cross-origin login got $code"; fi

echo
echo "== forced PIN rotation =="
ROT=$(curl -s -X POST "$BASE/api/users" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d "{\"username\":\"$U\",\"current_pin\":\"$PIN\",\"new_pin\":\"9137\"}")
if [[ "$ROT" == *'"ok":true'* ]]; then ok 'rotated to a new PIN'; else bad "rotate: $ROT"; fi

LOGIN2=$(curl -s -X POST "$BASE/api/login" -H 'Content-Type: application/json' -d "{\"username\":\"$U\",\"pin\":\"9137\"}")
if [[ "$LOGIN2" == *'"token"'* ]]; then ok 'new PIN works'; else bad "new PIN login: $LOGIN2"; fi
OLD=$(curl -s -X POST "$BASE/api/login" -H 'Content-Type: application/json' -d "{\"username\":\"$U\",\"pin\":\"$PIN\"}")
if [[ "$OLD" != *'"token"'* ]]; then ok 'old PIN no longer works'; else bad 'old PIN still accepted'; fi

echo
echo "passed $PASS, failed $FAIL"
[[ $FAIL -eq 0 ]]