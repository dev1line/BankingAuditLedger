#!/bin/bash

# =====================================================
# Banking Audit Ledger - AWS Deployment Script
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    print_success "AWS CLI installed"
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK not found. Please install AWS CDK."
        exit 1
    fi
    print_success "AWS CDK installed"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js."
        exit 1
    fi
    print_success "Node.js installed"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker installed"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure'."
        exit 1
    fi
    print_success "AWS credentials configured"
    
    # Check .env.aws file
    if [ ! -f "../.env.aws" ]; then
        print_error ".env.aws file not found. Copy from .env.aws.example and configure."
        exit 1
    fi
    print_success ".env.aws file found"
    
    echo ""
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_info "Running npm install..."
    npm install
    
    print_info "Building TypeScript..."
    npm run build
    
    print_success "Dependencies installed"
    echo ""
}

# Bootstrap CDK (if needed)
bootstrap_cdk() {
    print_header "Bootstrapping CDK"
    
    source ../.env.aws
    
    print_info "Bootstrapping CDK in account ${AWS_ACCOUNT_ID} region ${AWS_REGION}..."
    cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
    
    print_success "CDK bootstrapped"
    echo ""
}

# Build and push Docker images
build_and_push_images() {
    print_header "Building and Pushing Docker Images"
    
    source ../.env.aws
    
    # Get ECR login
    print_info "Logging into ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Build and push backend
    print_info "Building backend image..."
    cd ../backend-go
    docker build -t ${ECR_BACKEND_REPOSITORY}:latest .
    docker tag ${ECR_BACKEND_REPOSITORY}:latest \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_REPOSITORY}:latest
    
    print_info "Pushing backend image..."
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_REPOSITORY}:latest
    
    # Build and push frontend
    print_info "Building frontend image..."
    cd ../frontend-react
    docker build -t ${ECR_FRONTEND_REPOSITORY}:latest .
    docker tag ${ECR_FRONTEND_REPOSITORY}:latest \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_REPOSITORY}:latest
    
    print_info "Pushing frontend image..."
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_REPOSITORY}:latest
    
    cd ../infrastructure
    
    print_success "Docker images pushed to ECR"
    echo ""
}

# Deploy stacks
deploy_stacks() {
    print_header "Deploying CDK Stacks"
    
    print_info "Deploying Network Stack..."
    cdk deploy *-network-* --require-approval never
    
    print_info "Deploying Database Stack..."
    cdk deploy *-database-* --require-approval never
    
    print_info "Deploying Fabric Stack..."
    cdk deploy *-fabric-* --require-approval never
    
    print_info "Deploying Container Stack..."
    cdk deploy *-container-* --require-approval never
    
    print_info "Deploying Monitoring Stack..."
    cdk deploy *-monitoring-* --require-approval never
    
    print_success "All stacks deployed"
    echo ""
}

# Show deployment info
show_info() {
    print_header "Deployment Information"
    
    source ../.env.aws
    
    echo "AWS Account: ${AWS_ACCOUNT_ID}"
    echo "Region: ${AWS_REGION}"
    echo "Environment: ${ENVIRONMENT}"
    echo ""
    echo "Access your application at:"
    echo "  https://${DOMAIN_NAME}"
    echo ""
    echo "View CloudWatch Dashboard:"
    echo "  https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=BankingAuditLedger-Production"
    echo ""
    echo "View ECS Services:"
    echo "  https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/banking-audit-cluster/services"
    echo ""
    print_success "Deployment complete!"
    echo ""
}

# Main execution
main() {
    clear
    echo ""
    print_header "Banking Audit Ledger - AWS Deployment"
    echo ""
    
    check_prerequisites
    install_dependencies
    
    # Ask for confirmation
    read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    bootstrap_cdk
    build_and_push_images
    deploy_stacks
    show_info
}

# Run main
main "$@"

