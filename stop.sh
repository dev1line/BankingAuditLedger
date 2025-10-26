#!/bin/bash

# =================================
# Banking Audit Ledger - Stop Script
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Stop application services
stop_application_services() {
    print_header "Stopping Application Services"
    
    print_info "Stopping Docker Compose services..."
    docker-compose down
    print_success "Application services stopped"
    echo ""
}

# Stop Fabric network
stop_fabric_network() {
    print_header "Stopping Hyperledger Fabric Network"
    
    cd blockchain-fabric
    
    if docker ps | grep -q "peer0.bankingaudit.com"; then
        print_info "Stopping Fabric network..."
        ./scripts/network.sh down
        print_success "Fabric network stopped"
    else
        print_info "Fabric network is not running"
    fi
    
    cd ..
    echo ""
}

# Clean up
cleanup() {
    print_header "Cleanup"
    
    read -p "$(echo -e ${YELLOW}Remove Docker volumes? This will delete all data. [y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removing volumes..."
        docker volume prune -f
        print_success "Volumes removed"
    else
        print_info "Keeping volumes"
    fi
    echo ""
}

# Display status
display_status() {
    print_header "System Status"
    
    echo -e "${GREEN}All services have been stopped${NC}"
    echo ""
    echo "To restart the system:"
    echo "  ./start.sh"
    echo ""
    echo "To start services manually:"
    echo "  cd blockchain-fabric && ./scripts/network.sh up"
    echo "  docker-compose up -d"
    echo ""
}

# Main execution
main() {
    # Clear screen only if running in a terminal
    if [ -t 0 ]; then
        clear
    fi
    echo ""
    print_header "Banking Audit Ledger - Stop"
    echo ""
    
    stop_application_services
    stop_fabric_network
    cleanup
    display_status
    
    print_success "Shutdown complete!"
    echo ""
}

# Run main function
main "$@"

