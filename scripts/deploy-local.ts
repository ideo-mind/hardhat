#!/usr/bin/env tsx

/**
 * Deploy MoneyPot to Hardhat local network
 *
 * This script deploys MoneyPot with MockERC20 token for local testing.
 * It automatically starts a local Hardhat node if needed.
 *
 * Usage:
 *   npm run deploy:local
 *   or
 *   tsx scripts/deploy-local.ts
 */

import { execSync } from "child_process"
import { ethers } from "hardhat"
import { parseEther } from "ethers"

async function main() {
  console.log("🚀 Starting MoneyPot local deployment...")

  // Check if we're on localhost network
  const network = await ethers.provider.getNetwork()
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`)

  if (network.chainId !== 31337n) {
    console.log(
      "⚠️  Warning: Not on localhost network. Make sure you're running:"
    )
    console.log("   npx hardhat node")
    console.log(
      "   npx hardhat run scripts/deploy-local.ts --network localhost"
    )
  }

  // Get deployer account
  const [deployer, oracle] = await ethers.getSigners()
  console.log(`👤 Deployer: ${deployer.address}`)
  console.log(`🔮 Oracle: ${oracle.address}`)

  // Deploy MockERC20 token
  console.log("\n📦 Deploying MockERC20 token...")
  const MockERC20 = await ethers.getContractFactory("MockERC20")
  const mockToken = await MockERC20.deploy(
    "Mock USDC",
    "MUSDC",
    6, // decimals
    parseEther("1000000") // 1M tokens
  )
  await mockToken.waitForDeployment()
  const tokenAddress = await mockToken.getAddress()
  console.log(`✅ MockERC20 deployed to: ${tokenAddress}`)

  // Deploy MoneyPot
  console.log("\n🎯 Deploying MoneyPot contract...")
  const MoneyPot = await ethers.getContractFactory("MoneyPot")
  const moneyPot = await MoneyPot.deploy()
  await moneyPot.waitForDeployment()
  const moneyPotAddress = await moneyPot.getAddress()
  console.log(`✅ MoneyPot deployed to: ${moneyPotAddress}`)

  // Initialize MoneyPot
  console.log("\n🔧 Initializing MoneyPot...")
  await moneyPot.initialize(mockToken, oracle.address)
  console.log("✅ MoneyPot initialized successfully")

  // Display deployment summary
  console.log("\n" + "=".repeat(60))
  console.log("🎉 DEPLOYMENT COMPLETE!")
  console.log("=".repeat(60))
  console.log(`📦 MockERC20 Token: ${tokenAddress}`)
  console.log(`🎯 MoneyPot Contract: ${moneyPotAddress}`)
  console.log(`🔮 Trusted Oracle: ${oracle.address}`)
  console.log(`👤 Deployer: ${deployer.address}`)
  console.log("\n📋 Next Steps:")
  console.log("1. Fund accounts with MockERC20 tokens:")
  console.log(`   await mockToken.mint("0x...", parseEther("1000"))`)
  console.log("2. Create a pot:")
  console.log(
    `   await moneyPot.createPot(parseEther("100"), 86400, parseEther("1"), "0x...")`
  )
  console.log("3. Test the game mechanics!")

  // Save deployment info to file
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      mockToken: tokenAddress,
      moneyPot: moneyPotAddress,
      oracle: oracle.address,
      deployer: deployer.address,
    },
  }

  const fs = require("fs")
  fs.writeFileSync(
    "./deployments/localhost.json",
    JSON.stringify(deploymentInfo, null, 2)
  )
  console.log("\n💾 Deployment info saved to: ./deployments/localhost.json")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error)
    process.exit(1)
  })
