#!/bin/bash

# Banking Audit Ledger - Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists go; then
        missing_deps+=("go")
    fi
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_status "All prerequisites are installed!"
}

# Function to setup environment files
setup_environment() {
    print_header "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend-go/.env" ]; then
        cp backend-go/env.example backend-go/.env
        print_status "Created backend-go/.env"
    fi
    
    # Frontend environment
    if [ ! -f "frontend-react/.env.local" ]; then
        cp frontend-react/env.example frontend-react/.env.local
        print_status "Created frontend-react/.env.local"
    fi
}

# Function to setup Fabric network
setup_fabric() {
    print_header "Setting up Hyperledger Fabric network..."
    
    cd blockchain-fabric
    
    # Generate crypto materials
    if [ ! -d "network/crypto-config" ]; then
        print_status "Generating crypto materials..."
        cryptogen generate --config=./network/crypto-config.yaml --output="network/crypto-config"
    fi
    
    # Generate genesis block
    if [ ! -f "network/genesis.block" ]; then
        print_status "Generating genesis block..."
        configtxgen -profile BankingAuditGenesis -channelID system-channel -outputBlock ./network/genesis.block -configPath ./network
    fi
    
    # Generate channel configuration
    if [ ! -f "network/channel-artifacts/audit-channel.tx" ]; then
        print_status "Generating channel configuration..."
        mkdir -p network/channel-artifacts
        configtxgen -profile BankingAuditChannel -outputCreateChannelTx ./network/channel-artifacts/audit-channel.tx -channelID audit-channel -configPath ./network
    fi
    
    # Generate anchor peer updates
    if [ ! -f "network/channel-artifacts/BankingAuditMSPanchors.tx" ]; then
        print_status "Generating anchor peer updates..."
        configtxgen -profile BankingAuditChannel -outputAnchorPeersUpdate ./network/channel-artifacts/BankingAuditMSPanchors.tx -channelID audit-channel -asOrg BankingAuditMSP -configPath ./network
    fi
    
    cd ..
    print_status "Fabric network setup completed!"
}

# Function to build and start services
start_services() {
    print_header "Building and starting services..."
    
    # Build and start with Docker Compose
    docker-compose up --build -d
    
    print_status "Services are starting up..."
    print_status "Waiting for services to be ready..."
    
    # Wait for services to be healthy
    sleep 30
    
    # Check service health
    print_status "Checking service health..."
    
    if curl -f http://localhost:8080/healthz >/dev/null 2>&1; then
        print_status "Backend API is healthy"
    else
        print_warning "Backend API is not responding"
    fi
    
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_warning "Frontend is not responding"
    fi
}

# Function to deploy chaincode
deploy_chaincode() {
    print_header "Deploying chaincode..."
    
    # Wait for peer to be ready
    sleep 10
    
    # Package chaincode
    docker exec banking-audit-peer peer lifecycle chaincode package loghash.tar.gz --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode --lang golang --label loghash_1.0
    
    # Install chaincode
    docker exec banking-audit-peer peer lifecycle chaincode install loghash.tar.gz
    
    # Get package ID
    PACKAGE_ID=$(docker exec banking-audit-peer peer lifecycle chaincode queryinstalled | grep -o "Package ID: [^,]*" | cut -d' ' -f3)
    
    # Approve chaincode
    docker exec banking-audit-peer peer lifecycle chaincode approveformyorg -o orderer.bankingaudit.com:7050 --channelID audit-channel --name loghash --version 1.0 --package-id $PACKAGE_ID --sequence 1
    
    # Commit chaincode
    docker exec banking-audit-peer peer lifecycle chaincode commit -o orderer.bankingaudit.com:7050 --channelID audit-channel --name loghash --version 1.0 --sequence 1
    
    print_status "Chaincode deployed successfully!"
}

# Function to test the system
test_system() {
    print_header "Testing the system..."
    
    # Test API health
    if curl -f http://localhost:8080/healthz >/dev/null 2>&1; then
        print_status "API health check passed"
    else
        print_error "API health check failed"
        return 1
    fi
    
    # Test creating a log
    print_status "Testing log creation..."
    RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/logs \
        -H "Content-Type: application/json" \
        -d '{
            "source": "core-banking",
            "event_type": "transfer",
            "payload": {
                "from": "account-001",
                "to": "account-002",
                "amount": 1000,
                "currency": "USD"
            }
        }')
    
    if echo "$RESPONSE" | grep -q "id"; then
        print_status "Log creation test passed"
        LOG_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_status "Created log with ID: $LOG_ID"
        
        # Test verification
        print_status "Testing log verification..."
        sleep 5  # Wait for blockchain commit
        if curl -f "http://localhost:8080/api/v1/verify/$LOG_ID" >/dev/null 2>&1; then
            print_status "Log verification test passed"
        else
            print_warning "Log verification test failed"
        fi
    else
        print_error "Log creation test failed"
        return 1
    fi
}

# Function to show service URLs
show_urls() {
    print_header "Service URLs:"
    echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
    echo -e "${GREEN}Backend API:${NC} http://localhost:8080"
    echo -e "${GREEN}API Health:${NC} http://localhost:8080/healthz"
    echo -e "${GREEN}Metrics:${NC} http://localhost:9090/metrics"
    echo ""
    print_status "Setup completed successfully!"
    print_status "You can now access the Banking Audit Ledger system."
}

# Main setup function
main() {
    print_header "Banking Audit Ledger Setup"
    print_header "=========================="
    
    check_prerequisites
    setup_environment
    setup_fabric
    start_services
    deploy_chaincode
    test_system
    show_urls
}

# Run main function
main "$@"
