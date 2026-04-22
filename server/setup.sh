#!/bin/bash
# LastFootball API Server — Setup Script
# Run this on your VPS: bash server/setup.sh

set -e

echo "=== LastFootball API Server Setup ==="

# 1. Copy server files
echo "[1/5] Copying server files..."
mkdir -p /var/www/lastfootball/server
cp server/index.mjs /var/www/lastfootball/server/

# 2. Create env file (will prompt for API key)
if [ ! -f /var/www/lastfootball/server/.env ]; then
  echo "[2/5] Setting up API key..."
  read -p "Enter your API-Football key: " apikey
  echo "API_FOOTBALL_KEY=$apikey" > /var/www/lastfootball/server/.env
  echo "  Saved to /var/www/lastfootball/server/.env"
else
  echo "[2/5] .env already exists, skipping..."
fi

# 3. Install systemd service
echo "[3/5] Installing systemd service..."
cp server/lastfootball-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable lastfootball-api
systemctl restart lastfootball-api
sleep 2

if systemctl is-active --quiet lastfootball-api; then
  echo "  API server is running!"
else
  echo "  ERROR: API server failed to start. Check: journalctl -u lastfootball-api -n 20"
  exit 1
fi

# 4. Configure nginx reverse proxy
echo "[4/5] Configuring nginx..."
NGINX_CONF=$(nginx -t 2>&1 | grep -oP '/etc/nginx/\S+\.conf' | head -1 || echo "/etc/nginx/sites-enabled/default")

# Find the nginx config for lastfootball
if [ -f /etc/nginx/sites-enabled/lastfootball ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/lastfootball"
elif [ -f /etc/nginx/sites-enabled/lastfootball.conf ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/lastfootball.conf"
elif [ -f /etc/nginx/sites-enabled/default ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/default"
fi

echo "  Using nginx config: $NGINX_CONF"

# Check if /api/ location already exists
if grep -q 'location /api/' "$NGINX_CONF" 2>/dev/null; then
  echo "  /api/ location already configured in nginx"
else
  echo "  Adding /api/ proxy to nginx config..."
  echo ""
  echo "  ⚠️  MANUAL STEP: Add this inside your server {} block in $NGINX_CONF:"
  echo ""
  echo "    location /api/ {"
  echo "        proxy_pass http://127.0.0.1:3001;"
  echo "        proxy_http_version 1.1;"
  echo "        proxy_set_header Connection '';"
  echo "        proxy_set_header Host \$host;"
  echo "        proxy_set_header X-Real-IP \$remote_addr;"
  echo "        proxy_cache_bypass \$http_upgrade;"
  echo "        proxy_read_timeout 30s;"
  echo "    }"
  echo ""
fi

# 5. Test
echo "[5/5] Testing API..."
RESULT=$(curl -s -o /dev/null -w "%{http_code} %{time_total}s" http://127.0.0.1:3001/api/health)
echo "  Health check: $RESULT"

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "  1. Add the nginx /api/ location block (see above)"
echo "  2. Run: nginx -t && systemctl reload nginx"
echo "  3. Test: curl http://localhost:3001/api/health"
