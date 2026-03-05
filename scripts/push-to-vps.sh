#!/bin/bash
# GenesisPro - Push files to VPS
# Usage: bash scripts/push-to-vps.sh <VPS_IP>
# Example: bash scripts/push-to-vps.sh 158.220.121.180

set -euo pipefail

VPS_IP="${1:?Usage: bash scripts/push-to-vps.sh <VPS_IP>}"
VPS_USER="root"
APP_DIR="/opt/genesispro"

echo "========================================="
echo "  Pushing GenesisPro to VPS ($VPS_IP)"
echo "========================================="

# Files to sync
echo "[1/3] Syncing project files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.expo' \
    --exclude 'mobile-rork' \
    --exclude 'mobile' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '.env.production' \
    --include 'backend/***' \
    --include 'database/***' \
    --include 'nginx/***' \
    --include 'dashboard/***' \
    --include 'scripts/***' \
    --include 'docker-compose.yml' \
    --include '.dockerignore' \
    --exclude '*' \
    ./ "$VPS_USER@$VPS_IP:$APP_DIR/"

# Copy production env as .env
echo "[2/3] Copying environment config..."
scp .env.production "$VPS_USER@$VPS_IP:$APP_DIR/.env"

# Make scripts executable
echo "[3/3] Setting permissions..."
ssh "$VPS_USER@$VPS_IP" "chmod +x $APP_DIR/scripts/*.sh && chown -R genesispro:genesispro $APP_DIR"

echo ""
echo "========================================="
echo "  Files pushed successfully!"
echo "========================================="
echo ""
echo "Next steps on the VPS:"
echo "  ssh $VPS_USER@$VPS_IP"
echo "  cd $APP_DIR"
echo "  bash scripts/start.sh"
echo ""
