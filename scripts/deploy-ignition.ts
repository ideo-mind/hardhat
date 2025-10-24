#!/usr/bin/env tsx

/**
 * Deploy MoneyPot using Hardhat Ignition
 *
 * This script provides a unified deployment interface for MoneyPot using Hardhat Ignition.
 * It automatically detects the network and chooses the appropriate token strategy.
 *
 * Usage:
 *   npm run deploy:ignition -- --network localhost
 *   npm run deploy:ignition -- --network sepolia
 *   tsx scripts/deploy-ignition.ts --network localhost
 */

import { execSync } from "child_process"
import { config } from "../hardhat.config"

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "hardhat"
  console.log(`🚀 Starting MoneyPot Ignition deployment to ${networkName}...`)

  // Get network configuration
  const networkConfig = config.networks[networkName] as any
  if (!networkConfig) {
    throw new Error(`Network ${networkName} not found in hardhat.config.ts`)
  }

  console.log(`📡 Network: ${networkName}`)
  console.log(`🔗 Chain ID: ${networkConfig.chainId}`)

  // Determine deployment strategy
  const pyUSDAddress = networkConfig.tokens?.pyUSD?.address
  const usePyUSD =
    pyUSDAddress &&
    pyUSDAddress !== "0x0000000000000000000000000000000000000000"

  console.log(`💰 pyUSD Available: ${usePyUSD}`)
  if (usePyUSD) {
    console.log(`💰 pyUSD Address: ${pyUSDAddress}`)
  }

  // Build deployment command
  let command = `npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network ${networkName}`

  // Add parameters based on strategy
  if (usePyUSD) {
    command += ` --parameters '{"usePyUSD": true, "pyUSDAddress": "${pyUSDAddress}"}'`
  } else {
    command += ` --parameters '{"usePyUSD": false}'`
  }

  console.log(`\n🔧 Running deployment command:`)
  console.log(command)
  console.log("\n" + "=".repeat(60))

  try {
    // Execute deployment
    execSync(command, { stdio: "inherit" })

    console.log("\n" + "=".repeat(60))
    console.log("🎉 DEPLOYMENT COMPLETE!")
    console.log("=".repeat(60))

    if (usePyUSD) {
      console.log(`💰 Using pyUSD: ${pyUSDAddress}`)
    } else {
      console.log(`📦 Deployed MockERC20 token`)
    }

    console.log(`📡 Network: ${networkName}`)

    if (networkConfig.explorer) {
      console.log(`\n🔍 Explorer: ${networkConfig.explorer}`)
    }

    console.log("\n📋 Next Steps:")
    console.log("1. Check deployment artifacts in ./ignition/deployments/")
    console.log("2. Fund accounts with tokens")
    console.log("3. Test the game mechanics!")
  } catch (error) {
    console.error("❌ Deployment failed:", error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error)
    process.exit(1)
  })
