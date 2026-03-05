#!/bin/bash
# GenesisPro - Update & Redeploy
# Pull latest code and rebuild containers
# Usage: bash scripts/update.sh

set -euo pipefail

APP_DIR="/opt/genesispro"
cd "$APP_DIR"

echo "========================================="
echo "  GenesisPro - Update & Redeploy"
echo "========================================="

# 1. Backup before update
echo "[1/4] Creating pre-update backup..."
bash scripts/backup.sh

# 2. Pull latest code
echo "[2/4] Pulling latest code..."
git pull origin master

# 3. Rebuild API container
echo "[3/4] Rebuilding API..."
docker compose build api --no-cache

# 4. Restart with zero downtime
echo "[4/4] Restarting services..."
docker compose up -d api
docker compose restart nginx

# Verify
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "  Update successful! API is healthy."
    docker compose ps
else
    echo ""
    echo "  WARNING: API returned $HTTP_CODE"
    echo "  Check logs: docker compose logs api --tail 50"
fi
