import { HardhatRuntimeEnvironment } from "hardhat/types"
import { parseEther } from "viem"
import {
  logDeployment,
  saveDeploymentInfo,
  getAccounts,
  logAccountBalances,
  getExplorerUrl,
  DeploymentInfo,
} from "./deploy-helpers"

/**
 * Deploy MoneyPot with automatic token detection
 *
 * This script:
 * 1. Checks if pyUSD is configured for the current network
 * 2. If pyUSD is available, uses it as the underlying token
 * 3. If pyUSD is not available, deploys a MockERC20 token
 * 4. Deploys and initializes MoneyPot with the chosen token
 * 5. Saves deployment information
 */
async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🚀 Starting MoneyPot deployment...")
  console.log(`Network: ${hre.network.name}`)

  // Get accounts
  const { deployer, owner, user1, user2, user3, feeRecipient } =
    await getAccounts(hre)

  // Log initial balances
  await logAccountBalances(hre)

  // Check if pyUSD is configured for this network
  const networkConfig = hre.config.networks[hre.network.name] as any
  const pyUSDAddress = networkConfig?.tokens?.pyUSD?.address

  let underlyingToken: string
  let tokenName: string
  let tokenSymbol: string
  let tokenDecimals: number

  if (pyUSDAddress) {
    console.log(`✅ pyUSD found at address: ${pyUSDAddress}`)
    underlyingToken = pyUSDAddress
    tokenName = "Paxos Standard"
    tokenSymbol = "pyUSD"
    tokenDecimals = 6
  } else {
    console.log("⚠️  pyUSD not configured, deploying MockERC20...")

    // Deploy MockERC20 token
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20")
    const mockToken = await MockERC20.deploy(
      "Mock USDC",
      "MUSDC",
      6,
      parseEther("1000000") // 1M tokens
    )

    await mockToken.waitForDeployment()
    underlyingToken = await mockToken.getAddress()
    tokenName = "Mock USDC"
    tokenSymbol = "MUSDC"
    tokenDecimals = 6

    console.log(`✅ MockERC20 deployed at: ${underlyingToken}`)

    // Save MockERC20 deployment info
    const mockTokenDeployment: DeploymentInfo = {
      contractName: "MockERC20",
      address: underlyingToken,
      network: hre.network.name,
      timestamp: Date.now(),
      deployer: deployer.account.address,
      constructorArgs: ["Mock USDC", "MUSDC", 6, parseEther("1000000")],
    }

    logDeployment(mockTokenDeployment)
    await saveDeploymentInfo(
      hre.network.name,
      "MockERC20",
      underlyingToken,
      mockTokenDeployment.constructorArgs
    )
  }

  // Deploy MoneyPot contract
  console.log("\n📦 Deploying MoneyPot contract...")
  const MoneyPot = await hre.ethers.getContractFactory("MoneyPot")
  const moneyPot = await MoneyPot.deploy()

  await moneyPot.waitForDeployment()
  const moneyPotAddress = await moneyPot.getAddress()

  console.log(`✅ MoneyPot deployed at: ${moneyPotAddress}`)

  // Initialize MoneyPot with the underlying token and oracle
  console.log("\n🔧 Initializing MoneyPot...")
  const trustedOracle = user1.account.address // Use user1 as oracle

  const initTx = await moneyPot.initialize(underlyingToken, trustedOracle)
  await initTx.wait()

  console.log(`✅ MoneyPot initialized with token: ${underlyingToken}`)
  console.log(`✅ Trusted oracle set to: ${trustedOracle}`)

  // Save MoneyPot deployment info
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

  // Log final balances
  console.log("\n💰 Final Account Balances:")
  await logAccountBalances(hre)

  // Display contract information
  console.log("\n📋 Contract Information:")
  console.log("=".repeat(60))
  console.log(`MoneyPot Address: ${moneyPotAddress}`)
  console.log(`Underlying Token: ${underlyingToken} (${tokenSymbol})`)
  console.log(`Trusted Oracle: ${trustedOracle}`)
  console.log(`Owner: ${await moneyPot.owner()}`)

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log(
      `MoneyPot Explorer: ${getExplorerUrl(hre.network.name, moneyPotAddress)}`
    )
    console.log(
      `Token Explorer: ${getExplorerUrl(hre.network.name, underlyingToken)}`
    )
  }

  console.log("=".repeat(60))

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...")

  try {
    // Test token balance
    const tokenContract = await hre.ethers.getContractAt(
      "IERC20Metadata",
      underlyingToken
    )
    const deployerBalance = await tokenContract.balanceOf(
      deployer.account.address
    )
    console.log(
      `✅ Deployer token balance: ${hre.ethers.formatUnits(deployerBalance, tokenDecimals)} ${tokenSymbol}`
    )

    // Test MoneyPot initialization
    const underlyingTokenAddress = await moneyPot.underlying()
    console.log(`✅ MoneyPot underlying token: ${underlyingTokenAddress}`)

    const oracleAddress = await moneyPot.trustedOracle()
    console.log(`✅ MoneyPot trusted oracle: ${oracleAddress}`)
  } catch (error) {
    console.error("❌ Error testing functionality:", error)
  }

  console.log("\n🎉 Deployment completed successfully!")
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
