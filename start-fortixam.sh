#!/bin/bash
# Start FORTIXAM production server with Tailscale support
# This listens on ALL interfaces (0.0.0.0) so you can access via:
# - Local: http://localhost:3001
# - Tailscale: http://$(hostname -s):3001 or http://100.x.x.x:3001
# - LAN: http://192.168.x.x:3001

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 FORTIXAM Production Server${NC}"
echo ""

# Check if build exists
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}⚠️  No build found. Building first...${NC}"
    npm run build
fi

# Get Tailscale IP if available
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
LOCAL_IP=$(hostname -I | awk '{print $1}')
HOSTNAME=$(hostname -s)

echo -e "${CYAN}📱 Access URLs:${NC}"
echo "   Local:      http://localhost:3001"
echo "   LAN:        http://${LOCAL_IP}:3001"
if [ -n "$TAILSCALE_IP" ]; then
    echo "   Tailscale:  http://${TAILSCALE_IP}:3001"
    echo "   MagicDNS:   http://${HOSTNAME}:3001"
fi
echo ""
echo -e "${GREEN}▶️  Starting server on 0.0.0.0:3001...${NC}"
echo "   (Press Ctrl+C to stop)"
echo ""

# Start Next.js on all interfaces
npx next start -H 0.0.0.0 -p 3001
