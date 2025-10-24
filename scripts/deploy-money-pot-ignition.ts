import { HardhatRuntimeEnvironment } from "hardhat/types"
import { parseEther } from "viem"
import {
  logDeployment,
  saveDeploymentInfo,
  getAccounts,
  logAccountBalances,
  getExplorerUrl,
  DeploymentInfo,
  loadDeploymentInfo,
} from "./deploy-helpers"

/**
 * Deploy MoneyPot using Hardhat Ignition with automatic token detection
 *
 * This script uses Hardhat Ignition for deployment which provides:
 * - Better transaction management
 * - Automatic retry logic
 * - Deployment state tracking
 * - Gas optimization
 */
async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🚀 Starting MoneyPot deployment with Ignition...")
  console.log(`Network: ${hre.network.name}`)

  // Get accounts
  const { deployer, owner, user1, user2, user3, feeRecipient } =
    await getAccounts(hre)

  // Log initial balances
  await logAccountBalances(hre)

  // Check if pyUSD is configured for this network
  const networkConfig = hre.config.networks[hre.network.name] as any
  const pyUSDAddress = networkConfig?.tokens?.pyUSD?.address

  let usePyUSD = false
  let tokenName = "Mock USDC"
  let tokenSymbol = "MUSDC"
  let tokenDecimals = 6

  if (pyUSDAddress) {
    console.log(`✅ pyUSD found at address: ${pyUSDAddress}`)
    usePyUSD = true
    tokenName = "Paxos Standard"
    tokenSymbol = "pyUSD"
    tokenDecimals = 6
  } else {
    console.log("⚠️  pyUSD not configured, will deploy MockERC20...")
  }

  // Prepare deployment parameters
  const deploymentParams = {
    trustedOracle: user1.account.address,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenInitialSupply: parseEther("1000000"), // 1M tokens
  }

  console.log("\n📋 Deployment Parameters:")
  console.log("=".repeat(40))
  console.log(`Trusted Oracle: ${deploymentParams.trustedOracle}`)
  console.log(`Token Name: ${deploymentParams.tokenName}`)
  console.log(`Token Symbol: ${deploymentParams.tokenSymbol}`)
  console.log(`Token Decimals: ${deploymentParams.tokenDecimals}`)
  console.log(
    `Token Initial Supply: ${deploymentParams.tokenInitialSupply} wei`
  )
  console.log("=".repeat(40))

  // Deploy using Ignition
  console.log("\n🚀 Deploying contracts with Ignition...")

  try {
    const { moneyPot, mockToken, trustedOracle } = await hre.ignition.deploy(
      "MoneyPotModule",
      {
        parameters: {
          MoneyPotModule: deploymentParams,
        },
      }
    )

    console.log("\n✅ Deployment completed successfully!")
    console.log(`MoneyPot Address: ${await moneyPot.getAddress()}`)

    if (!usePyUSD) {
      console.log(`MockERC20 Address: ${await mockToken.getAddress()}`)
    }

    // Save deployment information
    const moneyPotAddress = await moneyPot.getAddress()
    const moneyPotDeployment: DeploymentInfo = {
      contractName: "MoneyPot",
      address: moneyPotAddress,
      network: hre.network.name,
      timestamp: Date.now(),
      deployer: deployer.account.address,
      constructorArgs: [],
    }

    logDeployment(moneyPotDeployment)
    await saveDeploymentInfo(
      hre.network.name,
      "MoneyPot",
      moneyPotAddress,
      moneyPotDeployment.constructorArgs
    )

    if (!usePyUSD) {
      const mockTokenAddress = await mockToken.getAddress()
      const mockTokenDeployment: DeploymentInfo = {
        contractName: "MockERC20",
        address: mockTokenAddress,
        network: hre.network.name,
        timestamp: Date.now(),
        deployer: deployer.account.address,
        constructorArgs: [
          tokenName,
          tokenSymbol,
          tokenDecimals,
          parseEther("1000000"),
        ],
      }

      logDeployment(mockTokenDeployment)
      await saveDeploymentInfo(
        hre.network.name,
        "MockERC20",
        mockTokenAddress,
        mockTokenDeployment.constructorArgs
      )
    }

    // Log final balances
    console.log("\n💰 Final Account Balances:")
    await logAccountBalances(hre)

    // Display contract information
    console.log("\n📋 Contract Information:")
    console.log("=".repeat(60))
    console.log(`MoneyPot Address: ${moneyPotAddress}`)
    console.log(
      `Underlying Token: ${usePyUSD ? pyUSDAddress : await mockToken.getAddress()} (${tokenSymbol})`
    )
    console.log(`Trusted Oracle: ${trustedOracle}`)
    console.log(`Owner: ${await moneyPot.owner()}`)

    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
      console.log(
        `MoneyPot Explorer: ${getExplorerUrl(hre.network.name, moneyPotAddress)}`
      )
      if (!usePyUSD) {
        console.log(
          `Token Explorer: ${getExplorerUrl(hre.network.name, await mockToken.getAddress())}`
        )
      }
    }

    console.log("=".repeat(60))

    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...")

    try {
      // Test MoneyPot initialization
      const underlyingTokenAddress = await moneyPot.underlying()
      console.log(`✅ MoneyPot underlying token: ${underlyingTokenAddress}`)

      const oracleAddress = await moneyPot.trustedOracle()
      console.log(`✅ MoneyPot trusted oracle: ${oracleAddress}`)

      // Test token balance if we deployed MockERC20
      if (!usePyUSD) {
        const deployerBalance = await mockToken.balanceOf(
          deployer.account.address
        )
        console.log(
          `✅ Deployer token balance: ${hre.ethers.formatUnits(deployerBalance, tokenDecimals)} ${tokenSymbol}`
        )
      }
    } catch (error) {
      console.error("❌ Error testing functionality:", error)
    }

    console.log("\n🎉 Deployment completed successfully!")
  } catch (error) {
    console.error("❌ Deployment failed:", error)
    throw error
  }
}

// Export the main function for Hardhat
export default main

// Run if called directly
if (require.main === module) {
  main(require("hardhat")).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
