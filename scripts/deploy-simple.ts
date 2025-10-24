#!/usr/bin/env tsx

/**
 * Simple MoneyPot deployment script for Hardhat
 *
 * This script deploys MoneyPot with MockERC20 token for local testing.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-simple.ts --network hardhat
 */

import hre from "hardhat"
import { parseEther } from "viem"

async function main() {
  console.log("🚀 Starting MoneyPot deployment...")

  // Get deployer account
  const [deployer, oracle] = await hre.viem.getWalletClients()
  console.log(`👤 Deployer: ${deployer.account.address}`)
  console.log(`🔮 Oracle: ${oracle.account.address}`)

  // Deploy MockERC20 token
  console.log("\n📦 Deploying MockERC20 token...")
  const mockToken = await hre.viem.deployContract("MockERC20", [
    "Mock USDC",
    "MUSDC",
    6, // decimals
    parseEther("1000000"), // 1M tokens
  ])
  console.log(`✅ MockERC20 deployed to: ${mockToken.address}`)

  // Deploy MoneyPot
  console.log("\n🎯 Deploying MoneyPot contract...")
  const moneyPot = await hre.viem.deployContract("MoneyPot", [])
  console.log(`✅ MoneyPot deployed to: ${moneyPot.address}`)

  // Initialize MoneyPot
  console.log("\n🔧 Initializing MoneyPot...")
  await moneyPot.write.initialize([mockToken.address, oracle.account.address])
  console.log("✅ MoneyPot initialized successfully")

  // Display deployment summary
  console.log("\n" + "=".repeat(60))
  console.log("🎉 DEPLOYMENT COMPLETE!")
  console.log("=".repeat(60))
  console.log(`📦 MockERC20 Token: ${mockToken.address}`)
  console.log(`🎯 MoneyPot Contract: ${moneyPot.address}`)
  console.log(`🔮 Trusted Oracle: ${oracle.account.address}`)
  console.log(`👤 Deployer: ${deployer.account.address}`)
  console.log("\n📋 Next Steps:")
  console.log("1. Fund accounts with MockERC20 tokens:")
  console.log(`   await mockToken.write.mint(["0x...", parseEther("1000")])`)
  console.log("2. Create a pot:")
  console.log(
    `   await moneyPot.write.createPot([parseEther("100"), 86400, parseEther("1"), "0x..."])`
  )
  console.log("3. Test the game mechanics!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error)
    process.exit(1)
  })
