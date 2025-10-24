#!/usr/bin/env tsx

/**
 * Deploy MoneyPot to testnet with pyUSD
 *
 * This script deploys MoneyPot using the configured pyUSD token for testnets.
 * It automatically detects the pyUSD address from the network configuration.
 *
 * Usage:
 *   npm run deploy:sepolia
 *   or
 *   tsx scripts/deploy-testnet.ts --network sepolia
 */

import { ethers } from "hardhat"
import { config } from "../hardhat.config"

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "sepolia"
  console.log(`🚀 Starting MoneyPot deployment to ${networkName}...`)

  // Get network configuration
  const networkConfig = config.networks[networkName] as any
  if (!networkConfig) {
    throw new Error(`Network ${networkName} not found in hardhat.config.ts`)
  }

  // Check for pyUSD configuration
  const pyUSDAddress = networkConfig.tokens?.pyUSD?.address
  if (!pyUSDAddress) {
    throw new Error(`pyUSD not configured for network ${networkName}`)
  }

  console.log(`📡 Network: ${networkName}`)
  console.log(`💰 pyUSD Address: ${pyUSDAddress}`)

  // Get deployer account
  const [deployer, oracle] = await ethers.getSigners()
  console.log(`👤 Deployer: ${deployer.address}`)
  console.log(`🔮 Oracle: ${oracle.address}`)

  // Check pyUSD balance
  const pyUSD = await ethers.getContractAt("IERC20Metadata", pyUSDAddress)
  const balance = await pyUSD.balanceOf(deployer.address)
  console.log(
    `💰 pyUSD Balance: ${ethers.formatUnits(balance, await pyUSD.decimals())}`
  )

  if (balance === 0n) {
    console.log(
      "⚠️  Warning: No pyUSD balance. You may need to get testnet tokens from:"
    )
    if (networkConfig.tokens?.pyUSD?.faucet) {
      networkConfig.tokens.pyUSD.faucet.forEach((faucet: string) => {
        console.log(`   ${faucet}`)
      })
    }
  }

  // Deploy MoneyPot
  console.log("\n🎯 Deploying MoneyPot contract...")
  const MoneyPot = await ethers.getContractFactory("MoneyPot")
  const moneyPot = await MoneyPot.deploy()
  await moneyPot.waitForDeployment()
  const moneyPotAddress = await moneyPot.getAddress()
  console.log(`✅ MoneyPot deployed to: ${moneyPotAddress}`)

  // Initialize MoneyPot with pyUSD
  console.log("\n🔧 Initializing MoneyPot with pyUSD...")
  await moneyPot.initialize(pyUSD, oracle.address)
  console.log("✅ MoneyPot initialized successfully")

  // Display deployment summary
  console.log("\n" + "=".repeat(60))
  console.log("🎉 DEPLOYMENT COMPLETE!")
  console.log("=".repeat(60))
  console.log(`📡 Network: ${networkName}`)
  console.log(`💰 pyUSD Token: ${pyUSDAddress}`)
  console.log(`🎯 MoneyPot Contract: ${moneyPotAddress}`)
  console.log(`🔮 Trusted Oracle: ${oracle.address}`)
  console.log(`👤 Deployer: ${deployer.address}`)

  if (networkConfig.explorer) {
    console.log(`\n🔍 View on explorer:`)
    console.log(
      `   MoneyPot: ${networkConfig.explorer}/address/${moneyPotAddress}`
    )
    console.log(`   pyUSD: ${networkConfig.explorer}/address/${pyUSDAddress}`)
  }

  console.log("\n📋 Next Steps:")
  console.log("1. Verify contracts on explorer (if supported)")
  console.log("2. Fund accounts with pyUSD tokens")
  console.log("3. Test the game mechanics!")

  // Save deployment info to file
  const deploymentInfo = {
    network: networkName,
    chainId: networkConfig.chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      pyUSD: pyUSDAddress,
      moneyPot: moneyPotAddress,
      oracle: oracle.address,
      deployer: deployer.address,
    },
    explorer: networkConfig.explorer,
  }

  const fs = require("fs")
  const deploymentsDir = "./deployments"
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir)
  }

  fs.writeFileSync(
    `./deployments/${networkName}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  )
  console.log(
    `\n💾 Deployment info saved to: ./deployments/${networkName}.json`
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error)
    process.exit(1)
  })
