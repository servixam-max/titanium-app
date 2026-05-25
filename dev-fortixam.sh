#!/bin/bash
# Start FORTIXAM development server with Tailscale support
cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}🚀 FORTIXAM Development Server${NC}"
echo ""

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
echo -e "${GREEN}▶️  Starting dev server on 0.0.0.0:3001...${NC}"
echo ""

npx next dev -H 0.0.0.0 -p 3001
