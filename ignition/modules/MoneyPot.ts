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

  if (hasTokenAddress) {
    // Try to use existing token contract - will fail if no contract exists at address
    try {
      underlyingToken = m.contractAt("IERC20", tokenAddress)
      tokenName = "Existing Token"
      tokenSymbol = "EXT"
    } catch (error) {
      // If contract doesn't exist at address, deploy a new one
      console.log(
        `No valid contract found at token address ${tokenAddress}, deploying new token...`
      )

      const tokenNameParam = m.getParameter("tokenName", "Deployed Token")
      const tokenSymbolParam = m.getParameter("tokenSymbol", "DTOKEN")
      const tokenDecimals = m.getParameter("tokenDecimals", 18)
      const initialSupply = m.getParameter(
        "initialSupply",
        parseEther("1000000")
      ) // 1M tokens

      underlyingToken = m.contract("ERC20", [
        tokenNameParam,
        tokenSymbolParam,
        tokenDecimals,
        initialSupply,
      ])
      tokenDeployed = true
      tokenName = "MoneyPot Token"
      tokenSymbol = "MPT"
    }
  } else {
    console.log("No token address provided, deploying new token...")
    // Deploy new token contract
    const tokenNameParam = m.getParameter("tokenName", "Deployed Token")
    const tokenSymbolParam = m.getParameter("tokenSymbol", "DTOKEN")
    const tokenDecimals = m.getParameter("tokenDecimals", 18)
    const initialSupply = m.getParameter("initialSupply", parseEther("1000000")) // 1M tokens

    underlyingToken = m.contract("ERC20", [
      tokenNameParam,
      tokenSymbolParam,
      tokenDecimals,
      initialSupply,
    ])
    tokenDeployed = true
    tokenName = "Deployed Token"
    tokenSymbol = "DTOKEN"
  }

  // Deploy the MoneyPot contract
  const moneyPot = m.contract("MoneyPot", [])

  // Initialize MoneyPot with the token and verifier
  m.call(moneyPot, "initialize", [underlyingToken, verifier], {
    id: "initialize_money_pot",
    after: [moneyPot],
  })

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
