import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"
import { parseEther } from "viem"

/**
 * MoneyPot deployment module with flexible token configuration
 *
 * This module deploys the MoneyPot contract with the following logic:
 * 1. If token address is provided in parameters, validate it has a contract
 * 2. If token address is invalid or not provided, deploy a new token contract
 * 3. Always requires a verifier address
 *
 * Example deployment:
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network localhost --parameters ignition/parameters/localhost.json
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network sepolia --parameters ignition/parameters/sepolia.json
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network cc --parameters ignition/parameters/cc.json
 */
const MoneyPotModule = buildModule("MoneyPotModule", (m) => {
  // Get deployment parameters from configuration files
  const verifier = m.getParameter("verifier")

  // Get token address with a default empty value
  const tokenAddress = m.getParameter("token", "")

  // Validate required parameters
  if (!verifier) {
    throw new Error("Verifier address is required but not provided")
  }

  let underlyingToken: any
  let tokenDeployed = false
  let tokenName = "Existing Token"
  let tokenSymbol = "EXT"

  // Check if we have a valid token address
  // Note: We'll check this at runtime since tokenAddress is a runtime parameter
  const hasTokenAddress = tokenAddress

  let deployToken = false

  // Try to use existing token contract - will fail if no contract exists at address
  if (
    tokenAddress &&
    tokenAddress !== "0x0000000000000000000000000000000000000000" &&
    tokenAddress !== ""
  ) {
    try {
      underlyingToken = m.contractAt("IERC20", tokenAddress)
    } catch (error) {
      // If contract doesn't exist at address, deploy a new one
      console.error(
        `No valid contract found at token address ${tokenAddress}, deploying new token...`
      )

      deployToken = true
    }
  } else {
    // No token address provided or zero address, deploy a new one
    console.log("No token address provided, deploying new token...")
    deployToken = true
  }

  if (deployToken) {
    underlyingToken = m.contract("ERC20", [
      "MoneyPot Token",
      "MPT",
      18,
      parseEther("1000000"),
    ])
    tokenDeployed = true
  }

  // Deploy the MoneyPot contract
  const moneyPot = m.contract("MoneyPot", [])

  // Initialize MoneyPot with the token and verifier
  m.call(moneyPot, "initialize", [underlyingToken, verifier], {
    id: "initialize_money_pot",
    after: [moneyPot],
  })

  // Initialize Pyth if parameters are provided
  const pythInstance = m.getParameter("pythInstance", "")
  const priceId = m.getParameter("priceId", "")

  if (pythInstance && priceId) {
    m.call(moneyPot, "initializePyth", [pythInstance, priceId], {
      id: "initialize_pyth",
      after: [moneyPot],
    })
  } else {
    console.log(
      "No Pyth instance or price ID provided, skipping Pyth initialization"
    )
  }

  // Return the deployed contracts
  return {
    moneyPot,
    underlyingToken,
  }
})

export default MoneyPotModule

// Export types for use in tests and scripts
export type MoneyPotDeployment = {
  moneyPot: any
  underlyingToken: any
}
