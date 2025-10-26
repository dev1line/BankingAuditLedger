#!/bin/bash
#
# Banking Audit Ledger - Fabric Network Management Script
# Uses test-network setup from network-base with loghash chaincode
#

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
NETWORK_BASE="${SCRIPT_DIR}/../network-base"

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

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Start network
network_up() {
    print_header "Starting Banking Audit Fabric Network"
    
    cd "${NETWORK_BASE}"
    
    # Add Fabric binaries to PATH
    export PATH="${FABRIC_BIN_PATH}:${PATH}"
    
    # Check if already running
    if docker ps | grep -q "peer0.org1.example.com"; then
        print_info "Network is already running"
    else
        print_info "Starting network and creating channel..."
        ./network.sh up createChannel -c mychannel
    fi
    
    # Deploy chaincode
    print_info "Deploying loghash chaincode..."
    ./network.sh deployCC -ccn loghash -ccp ../chaincode -ccl go
    
    print_success "Network is ready!"
}

# Stop network
network_down() {
    print_header "Stopping Banking Audit Fabric Network"
    
    cd "${NETWORK_BASE}"
    export PATH="${FABRIC_BIN_PATH}:${PATH}"
    ./network.sh down
    
    print_success "Network stopped"
}

# Clean up
network_clean() {
    print_header "Cleaning Up Network"
    
    cd "${NETWORK_BASE}"
    ./network.sh down
    
    # Remove generated artifacts
    rm -rf organizations/peerOrganizations
    rm -rf organizations/ordererOrganizations
    rm -rf system-genesis-block/*.block
    rm -rf channel-artifacts/*.block
    rm -f *.tar.gz
    
    print_success "Cleanup complete"
}

# Test chaincode
network_test() {
    print_header "Testing Chaincode"
    
    cd "${NETWORK_BASE}"
    
    export PATH="${FABRIC_BIN_PATH}:${PATH}"
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    
    print_info "Testing CommitLogHash..."
    peer chaincode invoke \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        -C mychannel \
        -n loghash \
        --tls \
        --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
        -c '{"Args":["CommitLogHash","test-log-123","abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234","{}"]}'
    
    sleep 2
    
    print_info "Testing GetLogHash..."
    peer chaincode query \
        -C mychannel \
        -n loghash \
        -c '{"Args":["GetLogHash","test-log-123"]}'
    
    print_success "Chaincode tests completed"
}

# Usage
print_usage() {
    echo "Usage: $0 {up|down|clean|test}"
    echo ""
    echo "Commands:"
    echo "  up     - Start network, create channel, and deploy chaincode"
    echo "  down   - Stop the network"
    echo "  clean  - Clean up all resources"
    echo "  test   - Test chaincode functions"
    echo ""
}

# Main
case "$1" in
    up)
        network_up
        ;;
    down)
        network_down
        ;;
    clean)
        network_clean
        ;;
    test)
        network_test
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
