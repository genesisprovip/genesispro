#!/bin/bash
# GenesisPro - Add genesispro.vip domain with SSL
# Run on VPS after pushing updated nginx config
# Usage: bash scripts/add-domain.sh

set -euo pipefail

DOMAIN="genesispro.vip"
EMAIL="genesispro.app@outlook.com"
APP_DIR="/opt/genesispro"

cd "$APP_DIR"

echo "========================================="
echo "  Adding $DOMAIN with SSL"
echo "========================================="

# Step 1: Temporarily switch to initial config to handle both domains on HTTP
echo "[1/4] Switching to HTTP config for certbot..."
cp nginx/initial.conf nginx/active.conf
docker compose restart nginx
sleep 3

# Step 2: Get SSL certificate for the root domain
echo "[2/4] Obtaining SSL certificate for $DOMAIN..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Step 3: Switch back to production config (HTTPS for both domains)
echo "[3/4] Switching to production HTTPS config..."
cp nginx/production.conf nginx/active.conf
docker compose restart nginx

# Step 4: Verify
echo "[4/4] Verifying..."
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/palenque" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "========================================="
    echo "  $DOMAIN is LIVE!"
    echo "========================================="
    echo ""
    echo "  Dashboard: https://$DOMAIN/palenque"
    echo "  API: https://$DOMAIN/api/v1"
    echo ""
else
    echo ""
    echo "HTTPS returned code: $HTTP_CODE"
    echo "Check: docker compose logs nginx --tail 30"
    echo ""
fi

# Also verify api subdomain still works
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.genesispro.vip/health" 2>/dev/null || echo "000")
echo "  api.genesispro.vip health: $API_CODE"
