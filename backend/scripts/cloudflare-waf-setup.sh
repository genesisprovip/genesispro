#!/bin/bash
# ============================================================
# GenesisPro - Cloudflare WAF Configuration Script
# ============================================================
# Date: 2026-03-12
# Domain: api.genesispro.vip (Zone: 7511700baacb6888041bf33a58e711af)
# Plan: Cloudflare FREE
#
# IMPORTANT: The current API token (CLOUDFLARE_TOKEN in credentials.md)
# only has DNS edit permissions. To run this script, you need to create
# a new API token with the following permissions:
#   - Zone > WAF > Edit
#   - Zone > Firewall Services > Edit
#   - Zone > Zone Settings > Edit
#
# HOW TO CREATE THE TOKEN:
#   1. Go to https://dash.cloudflare.com/profile/api-tokens
#   2. Click "Create Token"
#   3. Use "Custom token" template
#   4. Add permissions:
#      - Zone > WAF > Edit
#      - Zone > Zone Settings > Edit
#   5. Zone Resources: Include > Specific zone > genesispro.vip
#   6. Save the token and update CLOUDFLARE_WAF_TOKEN below
#
# FREE PLAN LIMITS:
#   - 5 custom WAF rules (no regex, no Log action)
#   - 1 rate limiting rule (IP only, 10s period, 10s timeout)
#   - Cloudflare Free Managed Ruleset (auto-enabled)
#   - NO OWASP ruleset (requires Pro $20/mo)
#   - NO Cloudflare Managed Ruleset (requires Pro $20/mo)
# ============================================================

# --- Configuration ---
ZONE_ID="7511700baacb6888041bf33a58e711af"
# REPLACE THIS with a token that has WAF edit permissions:
CF_TOKEN="${CLOUDFLARE_WAF_TOKEN:-YOUR_WAF_TOKEN_HERE}"

API_BASE="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}"

if [ "$CF_TOKEN" = "YOUR_WAF_TOKEN_HERE" ]; then
    echo "ERROR: Set CLOUDFLARE_WAF_TOKEN environment variable first."
    echo "  export CLOUDFLARE_WAF_TOKEN=your_token_here"
    exit 1
fi

# Helper function
cf_api() {
    local method=$1 endpoint=$2 data=$3
    if [ -n "$data" ]; then
        curl -s -X "$method" "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer $CF_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer $CF_TOKEN" \
            -H "Content-Type: application/json"
    fi
}

echo "============================================"
echo "GenesisPro Cloudflare WAF Setup"
echo "============================================"
echo ""

# --- Step 1: Verify token permissions ---
echo "[1/6] Verifying API token permissions..."
VERIFY=$(curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
    -H "Authorization: Bearer $CF_TOKEN")
if echo "$VERIFY" | grep -q '"status":"active"'; then
    echo "  OK - Token is valid and active"
else
    echo "  FAIL - Token is invalid or expired"
    echo "  $VERIFY"
    exit 1
fi

# --- Step 2: Enable Security Level = Medium ---
echo ""
echo "[2/6] Setting Security Level to 'medium'..."
# Options: off, essentially_off, low, medium, high, under_attack
RESULT=$(cf_api PATCH "/settings/security_level" '{"value":"medium"}')
if echo "$RESULT" | grep -q '"success":true'; then
    echo "  OK - Security level set to medium"
else
    echo "  Result: $RESULT"
fi

# --- Step 3: Enable Browser Integrity Check ---
echo ""
echo "[3/6] Enabling Browser Integrity Check..."
RESULT=$(cf_api PATCH "/settings/browser_check" '{"value":"on"}')
if echo "$RESULT" | grep -q '"success":true'; then
    echo "  OK - Browser Integrity Check enabled"
else
    echo "  Result: $RESULT"
fi

# --- Step 4: Create Custom WAF Rules (5 max on Free) ---
echo ""
echo "[4/6] Creating custom WAF rules..."

# We need to get the custom rules ruleset ID first, or create rules via the rulesets API
# On Free plan we get 5 custom rules. Here's our strategy:

# Rule 1: Block SQL injection patterns in URI and query string
# Rule 2: Block XSS patterns in URI and query string
# Rule 3: Block path traversal attempts
# Rule 4: Block requests with suspicious headers (no User-Agent)
# Rule 5: Challenge non-Mexico traffic to /api/v1/auth/ (optional, can skip)

# Using the custom rules API (rulesets)
# First, get existing custom ruleset
echo "  Fetching existing rulesets..."
RULESETS=$(cf_api GET "/rulesets")

# Create/update custom rules via the zone-level custom ruleset
# The rules use Cloudflare's wirefilter expression syntax

RULES_PAYLOAD='{
  "name": "GenesisPro WAF Custom Rules",
  "kind": "zone",
  "phase": "http_request_firewall_custom",
  "rules": [
    {
      "action": "block",
      "expression": "(http.request.uri.query contains \"UNION SELECT\" or http.request.uri.query contains \"OR 1=1\" or http.request.uri.query contains \"DROP TABLE\" or http.request.uri.query contains \"INSERT INTO\" or http.request.uri contains \"sql\" and http.request.uri contains \"admin\")",
      "description": "Block SQL injection patterns in query strings",
      "enabled": true
    },
    {
      "action": "block",
      "expression": "(http.request.uri contains \"<script\" or http.request.uri.query contains \"<script\" or http.request.uri.query contains \"javascript:\" or http.request.uri.query contains \"onerror=\" or http.request.uri.query contains \"onload=\")",
      "description": "Block XSS patterns in URI and query",
      "enabled": true
    },
    {
      "action": "block",
      "expression": "(http.request.uri contains \"/../\" or http.request.uri contains \"/etc/passwd\" or http.request.uri contains \"/proc/self\" or http.request.uri contains \"..%2f\" or http.request.uri contains \"%2e%2e\")",
      "description": "Block path traversal attempts",
      "enabled": true
    },
    {
      "action": "block",
      "expression": "(not http.request.uri matches \"^/(health|.well-known)\" and http.request.uri matches \"^/\" and len(http.user_agent) eq 0)",
      "description": "Block requests with empty User-Agent (except health checks)",
      "enabled": true
    },
    {
      "action": "managed_challenge",
      "expression": "(http.request.uri.path contains \"/api/v1/auth/\" and not ip.geoip.country in {\"MX\" \"US\"})",
      "description": "Challenge auth requests from outside MX/US",
      "enabled": true
    }
  ]
}'

echo "  Creating custom WAF ruleset..."
RESULT=$(cf_api PUT "/rulesets/phases/http_request_firewall_custom/entrypoint" "$RULES_PAYLOAD")
if echo "$RESULT" | grep -q '"success":true'; then
    echo "  OK - 5 custom WAF rules created"
else
    echo "  Result (first 500 chars):"
    echo "$RESULT" | head -c 500
fi

# --- Step 5: Create Rate Limiting Rule (1 max on Free) ---
echo ""
echo "[5/6] Creating rate limiting rule..."

# Free plan: 1 rule, IP-based, 10s counting period, 10s mitigation
# Best use: protect auth endpoints from brute force
RATELIMIT_PAYLOAD='{
  "name": "GenesisPro Rate Limit Rules",
  "kind": "zone",
  "phase": "http_ratelimit",
  "rules": [
    {
      "action": "block",
      "ratelimit": {
        "characteristics": ["ip.src"],
        "period": 10,
        "requests_per_period": 5,
        "mitigation_timeout": 10
      },
      "expression": "(http.request.uri.path contains \"/api/v1/auth/\")",
      "description": "Rate limit auth endpoints: 5 req/10s per IP",
      "enabled": true
    }
  ]
}'

RESULT=$(cf_api PUT "/rulesets/phases/http_ratelimit/entrypoint" "$RATELIMIT_PAYLOAD")
if echo "$RESULT" | grep -q '"success":true'; then
    echo "  OK - Rate limiting rule created (auth: 5 req/10s)"
else
    echo "  Result (first 500 chars):"
    echo "$RESULT" | head -c 500
fi

# --- Step 6: Verify Managed Rules are active ---
echo ""
echo "[6/6] Checking managed rulesets status..."
RULESETS=$(cf_api GET "/rulesets")
echo "  Active rulesets:"
echo "$RULESETS" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if d.get('success'):
        for rs in d.get('result', []):
            print('    - {} [phase: {}]'.format(rs.get('name','?'), rs.get('phase','?')))
    else:
        print('    Error:', d.get('errors'))
except:
    print('    Could not parse response')
" 2>/dev/null || echo "  (could not parse)"

echo ""
echo "============================================"
echo "WAF Setup Complete"
echo "============================================"
echo ""
echo "CURRENT PROTECTION LAYERS:"
echo "  1. Cloudflare Free Managed Ruleset (auto)"
echo "  2. 5 Custom WAF rules (SQLi, XSS, traversal, empty UA, geo-challenge)"
echo "  3. 1 Rate limit rule (auth: 5 req/10s per IP)"
echo "  4. Browser Integrity Check (enabled)"
echo "  5. Security Level: Medium"
echo ""
echo "NGINX LAYERS (already deployed on VPS):"
echo "  6. Rate limits: auth 3/min, api 10r/s, webhook 5r/s"
echo "  7. Connection limit: 30/IP"
echo "  8. Bot blocking: sqlmap, nikto, nmap, etc."
echo "  9. Express: 5 failed logins -> 15min IP ban"
echo ""
echo "TO UPGRADE (recommended for Abril event):"
echo "  - Cloudflare Pro ($20/mo) adds:"
echo "    * OWASP Core Ruleset (comprehensive SQLi/XSS/RCE protection)"
echo "    * Cloudflare Managed Ruleset (zero-day protection)"
echo "    * 20 custom rules + 10 rate limit rules"
echo "    * Bot Fight Mode (advanced)"
echo "    * Regex in expressions"
