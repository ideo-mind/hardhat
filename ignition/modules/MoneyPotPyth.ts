import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

/**
 * MoneyPotPyth initialization module
 *
 * This module initializes Pyth price feed for an existing MoneyPot contract.
 * It should be run after MoneyPot deployment.
 *
 * Example deployment:
 * npx hardhat ignition deploy ignition/modules/MoneyPotPyth.ts --network localhost --parameters ignition/parameters/localhost.json
 * npx hardhat ignition deploy ignition/modules/MoneyPotPyth.ts --network sepolia --parameters ignition/parameters/sepolia.json
 */
const MoneyPotPythModule = buildModule("MoneyPotPythModule", (m) => {
  // Get deployment parameters from configuration files
  const moneyPotAddress = m.getParameter("moneyPotAddress")
  const pythInstance = m.getParameter("pythInstance")

  // Validate required parameters
  if (!moneyPotAddress) {
    throw new Error("MoneyPot address is required but not provided")
  }

  if (!pythInstance) {
    throw new Error("Pyth instance address is required but not provided")
  }

  // Get the existing MoneyPot contract
  const moneyPot = m.contractAt("MoneyPot", moneyPotAddress)

  // Initialize Pyth for the MoneyPot contract
  m.call(moneyPot, "initializePyth", [pythInstance], {
    id: "initialize_pyth",
    after: [moneyPot],
  })

  // Return the contract
  return {
    moneyPot,
  }
})

export default MoneyPotPythModule

// Export types for use in tests and scripts
export type MoneyPotPythDeployment = {
  moneyPot: any
}
