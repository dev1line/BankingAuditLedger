#!/bin/bash

# =================================
# Banking Audit Ledger - Startup Script
# =================================
# This script starts the entire Banking Audit Ledger system
# including Hyperledger Fabric network and all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
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

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local all_good=true
    
    if command_exists docker; then
        print_success "Docker is installed"
    else
        print_error "Docker is not installed"
        all_good=false
    fi
    
    if command_exists docker-compose; then
        print_success "Docker Compose is installed"
    else
        print_error "Docker Compose is not installed"
        all_good=false
    fi
    
    # Check if Docker daemon is running
    if docker info >/dev/null 2>&1; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Please install missing prerequisites"
        exit 1
    fi
    
    echo ""
}

# Start Fabric network
start_fabric_network() {
    print_header "Starting Hyperledger Fabric Network"
    
    cd blockchain-fabric
    
    # Check if network is already running
    if docker ps | grep -q "peer0.bankingaudit.com"; then
        print_info "Fabric network is already running"
    else
        print_info "Starting Fabric network..."
        ./scripts/network.sh up
        print_success "Fabric network started with chaincode deployed"
    fi
    
    cd ..
    echo ""
}

# Start application services
start_application_services() {
    print_header "Starting Application Services"
    
    print_info "Stopping any existing services..."
    docker-compose down 2>/dev/null || true
    
    print_info "Building and starting services..."
    docker-compose up -d --build
    
    print_success "Services started"
    echo ""
}

# Wait for services to be healthy
wait_for_services() {
    print_header "Waiting for Services to be Ready"
    
    print_info "Waiting for PostgreSQL..."
    timeout=60
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if docker-compose exec -T postgres pg_isready -U audit_user -d banking_audit_db >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    print_info "Waiting for Backend API..."
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:8080/healthz >/dev/null 2>&1; then
            print_success "Backend API is ready"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    print_info "Waiting for Frontend..."
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_success "Frontend is ready"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    echo ""
}

# Display status
display_status() {
    print_header "System Status"
    
    echo -e "${GREEN}All services are running!${NC}"
    echo ""
    echo "Access Points:"
    echo "  📱 Frontend:        http://localhost:3000"
    echo "  🔧 Backend API:     http://localhost:8080"
    echo "  💊 Health Check:    http://localhost:8080/healthz"
    echo "  📊 Metrics:         http://localhost:9090/metrics"
    echo ""
    echo "Database:"
    echo "  🗄️  PostgreSQL:      localhost:5432"
    echo "  📦 Database:        banking_audit_db"
    echo "  👤 User:            audit_user"
    echo ""
    echo "Blockchain:"
    echo "  ⛓️  Network:         mychannel"
    echo "  📜 Chaincode:       loghash (v1.0)"
    echo "  🔗 Organization:    Org1MSP"
    echo ""
    echo "Useful Commands:"
    echo "  View logs:          docker-compose logs -f [service-name]"
    echo "  Stop services:      docker-compose down"
    echo "  Restart backend:    docker-compose restart backend"
    echo "  Database shell:     docker-compose exec postgres psql -U audit_user -d banking_audit_db"
    echo ""
}

# Test the system
test_system() {
    print_header "Testing System"
    
    print_info "Creating a test log..."
    response=$(curl -s -X POST http://localhost:8080/api/v1/logs \
      -H "Content-Type: application/json" \
      -d '{
        "source": "startup-test",
        "event_type": "system_test",
        "payload": {
          "message": "System startup test",
          "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
        }
      }')
    
    log_id=$(echo $response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$log_id" ]; then
        print_success "Test log created with ID: $log_id"
        
        # Wait a moment for blockchain commit
        sleep 3
        
        print_info "Verifying log..."
        verify_response=$(curl -s http://localhost:8080/api/v1/verify/$log_id)
        is_valid=$(echo $verify_response | grep -o '"is_valid":[^,}]*' | cut -d':' -f2)
        
        if [ "$is_valid" = "true" ]; then
            print_success "Log verification successful!"
        else
            print_error "Log verification failed"
        fi
    else
        print_error "Failed to create test log"
    fi
    
    echo ""
}

# Main execution
main() {
    # Clear screen only if running in a terminal
    if [ -t 0 ]; then
        clear
    fi
    echo ""
    print_header "Banking Audit Ledger - Startup"
    echo ""
    
    check_prerequisites
    start_fabric_network
    start_application_services
    wait_for_services
    test_system
    display_status
    
    print_success "System is ready!"
    echo ""
}

# Run main function
main "$@"

