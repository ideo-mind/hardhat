#!/usr/bin/env just --justfile

# Justfile for Hardhat Project with admin/verifier keys
# Manages deployments to multiple networks

set shell := ["sh", "-c"]
set dotenv-filename := ".env"
set export := true

# Default command shows available commands
default:
    @just --list

# ============================================================================
# Setup and Installation
# ============================================================================

# Install dependencies
install:
    npm install

# Clean build artifacts
clean:
    rm -rf artifacts cache ignition/deployments
    npx hardhat clean

# Create .env file from example
setup-env:
    @if [ ! -f .env ]; then \
        cp .env.example .env 2>/dev/null || echo "ADMIN_PRIVATE_KEY=\nVERIFIER_PRIVATE_KEY=\nINFURA_KEY=\nALCHEMY_KEY=\nNETWORK=hardhat" > .env; \
        echo "✅ Created .env file - Add your private keys"; \
    else \
        echo "ℹ️  .env already exists"; \
    fi

# Compile contracts
compile:
    npx hardhat compile

# Complete setup process
setup: install setup-env compile
    @echo "✅ Setup complete!"

# ============================================================================
# Network Commands
# ============================================================================

# Start local hardhat node
node:
    npx hardhat node

# Connect to console on specific network
console network="hardhat":
    npx hardhat console --network {{network}}

# Show all configured networks
networks:
    @echo "📡 Available Networks:"
    @echo "  • hardhat    - Local development"
    @echo "  • localhost  - Local node (http://localhost:8545)"
    @echo "  • sepolia    - Ethereum testnet"
    @echo "  • somnia     - Somnia network"
    @echo "  • cc         - Chiliz Chain"

# ============================================================================
# Deployment Commands
# ============================================================================

# Deploy to hardhat network
deploy module="Counter":
    npx hardhat ignition deploy ignition/modules/{{module}}.ts

# Deploy to specific network
deploy-to network="hardhat" module="Counter":
    @echo "🚀 Deploying to {{network}}..."
    npx hardhat ignition deploy ignition/modules/{{module}}.ts --network {{network}}

# Common network deployments
deploy-localhost module="Counter":
    just deploy-to localhost {{module}}

deploy-sepolia module="Counter":
    just deploy-to sepolia {{module}}

deploy-somnia module="Counter":
    just deploy-to somnia {{module}}

deploy-cc module="Counter":
    just deploy-to cc {{module}}

# Deploy to all networks
deploy-all module="Counter":
    @echo "🔄 Deploying to all networks..."
    @echo "1️⃣  Deploying to hardhat..."
    just deploy {{module}}
    @echo "2️⃣  Deploying to sepolia..."
    just deploy-sepolia {{module}}
    @echo "3️⃣  Deploying to somnia..."
    just deploy-somnia {{module}}
    @echo "4️⃣  Deploying to cc (Chiliz)..."
    just deploy-cc {{module}}
    @echo "✅ All deployments complete"

# ============================================================================
# Testing Commands
# ============================================================================

# Run tests
test:
    npx hardhat test

# Run tests with gas reporting
test-gas:
    REPORT_GAS=true npx hardhat test

# Run tests on specific network
test-network network="hardhat":
    npx hardhat test --network {{network}}

# ============================================================================
# Account Management Commands
# ============================================================================

# Check accounts and balances on network
accounts network="hardhat":
    @npx hardhat run --network {{network}} <(echo " \
    async function main() { \
        const clients = await hre.viem.getWalletClients(); \
        const pub = await hre.viem.getPublicClient(); \
        console.log('\\nAccounts on {{network}}:'); \
        console.log('-'.repeat(60)); \
        for (let i = 0; i < clients.length; i++) { \
            const addr = clients[i].account.address; \
            const balance = await pub.getBalance({ address: addr }); \
            const eth = hre.viem.formatEther(balance); \
            const label = i === 0 ? 'Admin/Deployer' : i === 1 ? 'Verifier/Operator' : `Account ${i}`; \
            console.log(`${label.padEnd(16)}: ${addr} (${eth} ETH)`); \
        } \
        console.log('-'.repeat(60)); \
    } \
    main().catch(console.error);")

# Generate a new wallet
generate-wallet:
    @node -e "const { Wallet } = require('ethers'); \
    const w = Wallet.createRandom(); \
    console.log('Address:     ' + w.address); \
    console.log('Private Key: ' + w.privateKey); \
    console.log('\\nAdd to .env as ADMIN_PRIVATE_KEY or VERIFIER_PRIVATE_KEY');"

# ============================================================================
# Faucet Links
# ============================================================================

# Show faucet links for all networks
faucets:
    @echo "🚰 Network Faucets:"
    @echo "\nSepolia:"
    @echo "  • https://sepoliafaucet.com"
    @echo "  • https://faucet.sepolia.dev"
    @echo "  • https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
    @echo "\nSomnia:"
    @echo "  • https://faucet.somnia.network"
    @echo "\nChiliz Chain:"
    @echo "  • https://faucet.chiliz.com"
    @echo "\nGeneral:"
    @echo "  • https://faucet.paradigm.xyz (multiple networks)"

# ============================================================================
# Ignition Deployment Commands
# ============================================================================

# List all ignition deployments
deployments:
    npx hardhat ignition deployments

# Get deployment status
deployment-status id network="hardhat":
    npx hardhat ignition status {{id}} --network {{network}}

# ============================================================================
# Utility Commands
# ============================================================================

# Show configuration status
config:
    @echo "📊 Configuration:"
    @echo "\nProject:"
    @echo "  • Node:     $(node --version)"
    @echo "  • Network:  ${NETWORK:-hardhat}"
    @echo "\nKeys:"
    @echo "  • Admin:    $(if [ -n "$ADMIN_PRIVATE_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    @echo "  • Verifier: $(if [ -n "$VERIFIER_PRIVATE_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    @echo "\nAPI Keys:"
    @echo "  • Infura:   $(if [ -n "$INFURA_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"
    @echo "  • Alchemy:  $(if [ -n "$ALCHEMY_KEY" ]; then echo "✅ Set"; else echo "❌ Not set"; fi)"

# Run a script
run script network="hardhat":
    npx hardhat run scripts/{{script}} --network {{network}}

# Format code
format:
    npx prettier --write "**/*.{js,ts,json,sol}"
