#!/bin/bash
# GenesisPro - Start application with SSL setup
# Run from /opt/genesispro after files are copied
# Usage: bash scripts/start.sh

set -euo pipefail

DOMAIN="api.genesispro.vip"
EMAIL="genesispro.app@outlook.com"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$APP_DIR"

echo "========================================="
echo "  GenesisPro - Starting Services"
echo "========================================="

# Check .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Copy .env.production to .env first"
    exit 1
fi

# Step 1: Start with initial config (HTTP only) to get SSL cert
echo "[1/4] Starting services with HTTP..."
cp nginx/initial.conf nginx/active.conf
docker compose up -d db api

echo "Waiting for database to be ready..."
sleep 10

# Verify API is healthy
until docker compose exec api wget -q --spider http://localhost:3000/health 2>/dev/null; do
    echo "  Waiting for API..."
    sleep 3
done
echo "  API is healthy!"

# Start nginx with initial (HTTP) config
# Use initial.conf for first boot
docker compose up -d nginx

# Step 2: Get SSL certificate
echo "[2/4] Obtaining SSL certificate..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Step 3: Switch to production config (HTTPS)
echo "[3/4] Switching to HTTPS config..."
cp nginx/production.conf nginx/active.conf
docker compose restart nginx

# Step 4: Verify
echo "[4/4] Verifying deployment..."
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "========================================="
    echo "  GenesisPro is LIVE!"
    echo "========================================="
    echo ""
    echo "  API: https://$DOMAIN/api/v1"
    echo "  Health: https://$DOMAIN/health"
    echo ""
    echo "  Docker status:"
    docker compose ps
else
    echo ""
    echo "HTTPS not reachable yet (code: $HTTP_CODE)"
    echo "Check DNS is pointing to this server."
    echo "You can verify HTTP works: curl http://$DOMAIN/health"
    echo ""
    docker compose ps
fi
