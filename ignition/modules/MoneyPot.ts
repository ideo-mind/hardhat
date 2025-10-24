import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

/**
 * MoneyPot deployment module using configured parameters
 *
 * This module deploys the MoneyPot contract using the parameters configured
 * in the ignition/parameters/ directory for each network.
 *
 * Example deployment:
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network localhost
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network sepolia
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network cc
 */
const MoneyPotModule = buildModule("MoneyPotModule", (m) => {
  // Get deployment parameters from configuration files
  const verifier = m.getParameter("verifier")
  const token = m.getParameter("token")

  // Log deployment parameters
  console.log("🚀 Deploying MoneyPot with parameters:")
  console.log(`   Verifier: ${verifier}`)
  console.log(`   Token: ${token}`)

  // Use existing token contract (configured in parameters)
  // Use MockERC20 as the interface since it implements IERC20Metadata
  const underlyingToken = m.contractAt("MockERC20", token)

  // Deploy the MoneyPot contract
  const moneyPot = m.contract("MoneyPot", [])

  // Initialize MoneyPot with the token and verifier
  m.call(moneyPot, "initialize", [underlyingToken, verifier], {
    id: "initialize_money_pot",
    after: [moneyPot, underlyingToken],
  })

  // Return the deployed contracts
  return {
    moneyPot,
    underlyingToken,
    verifier,
  }
})

export default MoneyPotModule

// Export types for use in tests and scripts
export type MoneyPotDeployment = ReturnType<(typeof MoneyPotModule)["_deploy"]>
