import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"
import { parseEther } from "viem"

/**
 * MoneyPot deployment module with pyUSD/ERC20 token support
 *
 * This module deploys the MoneyPot contract with automatic token detection:
 * - If pyUSD is configured in the network, it uses pyUSD
 * - Otherwise, it deploys a MockERC20 token and uses that
 *
 * Example deployment:
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network localhost
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network sepolia
 */
const MoneyPotModule = buildModule("MoneyPotModule", (m) => {
  // Get deployment parameters with defaults
  const trustedOracle = m.getParameter("trustedOracle", m.getAccount(1)) // Use account 1 as oracle by default
  const usePyUSD = m.getParameter("usePyUSD", false) // Set to true to force pyUSD usage
  const pyUSDAddress = m.getParameter(
    "pyUSDAddress",
    "0x0000000000000000000000000000000000000000"
  )

  // MockERC20 parameters (used when pyUSD is not available)
  const tokenName = m.getParameter("tokenName", "Mock USDC")
  const tokenSymbol = m.getParameter("tokenSymbol", "MUSDC")
  const tokenDecimals = m.getParameter("tokenDecimals", 6)
  const tokenInitialSupply = m.getParameter(
    "tokenInitialSupply",
    parseEther("1000000")
  ) // 1M tokens

  // Log deployment parameters
  console.log("🚀 Deploying MoneyPot with parameters:")
  console.log(`   Trusted Oracle: ${trustedOracle}`)
  console.log(`   Use pyUSD: ${usePyUSD}`)
  console.log(`   pyUSD Address: ${pyUSDAddress}`)

  // Determine which token to use
  let underlyingToken: any
  let tokenDeployed = false

  if (
    usePyUSD &&
    pyUSDAddress !== "0x0000000000000000000000000000000000000000"
  ) {
    console.log("📦 Using existing pyUSD token")
    // Use existing pyUSD contract
    underlyingToken = m.contractAt("IERC20Metadata", pyUSDAddress)
  } else {
    console.log("📦 Deploying MockERC20 token")
    // Deploy MockERC20 token
    underlyingToken = m.contract("MockERC20", [
      tokenName,
      tokenSymbol,
      tokenDecimals,
      tokenInitialSupply,
    ])
    tokenDeployed = true
  }

  // Deploy the MoneyPot contract
  const moneyPot = m.contract("MoneyPot", [])

  // Initialize MoneyPot with the token and oracle
  m.call(moneyPot, "initialize", [underlyingToken, trustedOracle], {
    id: "initialize-money-pot",
    after: [moneyPot, underlyingToken],
  })

  // Return the deployed contracts
  return {
    moneyPot,
    underlyingToken,
    trustedOracle,
    tokenDeployed,
    tokenName: tokenDeployed ? tokenName : "pyUSD",
    tokenSymbol: tokenDeployed ? tokenSymbol : "pyUSD",
  }
})

export default MoneyPotModule

// Export types for use in tests and scripts
export type MoneyPotDeployment = ReturnType<(typeof MoneyPotModule)["_deploy"]>
