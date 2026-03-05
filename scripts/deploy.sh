#!/bin/bash
# GenesisPro - Initial VPS Setup & Deploy Script
# Run this ONCE on a fresh Ubuntu 22.04/24.04 VPS
# Usage: ssh root@YOUR_IP 'bash -s' < scripts/deploy.sh

set -euo pipefail

DOMAIN="api.genesispro.vip"
APP_DIR="/opt/genesispro"
BACKUP_DIR="/opt/genesispro-backups"

echo "========================================="
echo "  GenesisPro VPS Setup"
echo "========================================="

# 1. System update
echo "[1/8] Updating system..."
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban

# 2. Firewall
echo "[2/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo "y" | ufw enable

# 3. Create app user
echo "[3/8] Creating app user..."
if ! id "genesispro" &>/dev/null; then
    useradd -m -s /bin/bash genesispro
    usermod -aG sudo genesispro
    echo "genesispro ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/genesispro
fi

# 4. Install Docker
echo "[4/8] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker genesispro
fi

# 5. Install Docker Compose
echo "[5/8] Installing Docker Compose..."
if ! command -v docker compose &>/dev/null; then
    apt-get install -y docker-compose-plugin
fi

# 6. Create directories
echo "[6/8] Creating directories..."
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR
mkdir -p $APP_DIR/nginx/ssl
chown -R genesispro:genesispro $APP_DIR $BACKUP_DIR

# 7. Setup backup cron
echo "[7/8] Setting up backup cron..."
CRON_JOB="0 3 * * * $APP_DIR/scripts/backup.sh >> /var/log/genesispro-backup.log 2>&1"
(crontab -u genesispro -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_JOB") | crontab -u genesispro -

# 8. Setup log rotation
echo "[8/8] Configuring log rotation..."
cat > /etc/logrotate.d/genesispro <<EOF
/var/log/genesispro-backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF

echo ""
echo "========================================="
echo "  VPS Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Copy project files to $APP_DIR"
echo "  2. Copy .env.production to $APP_DIR/.env"
echo "  3. Point DNS: $DOMAIN -> $(curl -s ifconfig.me)"
echo "  4. Run: cd $APP_DIR && bash scripts/start.sh"
echo ""
