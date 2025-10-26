# Hyperledger Fabric Blockchain Component

This component implements the blockchain layer for the Banking Audit Ledger system using Hyperledger Fabric.

## Overview

The blockchain component provides:

- Immutable storage of log hashes
- Verification of log integrity
- Chaincode for log hash operations

## Architecture

- **Network**: Single organization setup for PoC
- **Chaincode**: Go-based smart contract for log hash management
- **Functions**:
  - `CommitLogHash`: Store log hash on blockchain
  - `GetLogHash`: Retrieve and verify log hash

## Quick Start

1. Start the Fabric test network:

```bash
./network.sh up
```

2. Deploy the chaincode:

```bash
./network.sh deployCC
```

3. Test the chaincode:

```bash
./test-chaincode.sh
```

## Files Structure

- `chaincode/`: Go chaincode implementation
- `network/`: Fabric network configuration
- `scripts/`: Network management scripts
