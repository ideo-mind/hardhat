import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"
import { Contract } from "ethers5"
import { MoneyPot } from "typechain-types/contracts/MoneyPot"
import { MoneyPotToken } from "typechain-types/contracts/MoneyPotToken"
import { MockERC20 as ERC20 } from "typechain-types/contracts/MockERC20"
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

  let underlyingToken: ERC20

  let deployToken = false

  // Try to use existing token contract - will fail if no contract exists at address
  if (tokenAddress !== undefined) {
    try {
      underlyingToken = m.contractAt("IERC20", tokenAddress)
      if (
        process.env.NETWORK == "localhost" ||
        process.env.NETWORK == "hardhat"
      ) {
        throw new Error("failing for token deployment")
      }

      underlyingToken = tokenAddress
    } catch (error) {
      console.error(error)
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
    underlyingToken = m.contract("MockERC20", [
      "MoneyPot Token",
      "MPT",
      18,
      parseEther("1000000"),
    ])
  }

  // Deploy the MoneyPot contract
  const moneyPot = m.contract("MoneyPot", [])

  // Initialize MoneyPot with the token and verifier
  const moneyPotInitialization = m.call(moneyPot, "initialize", [underlyingToken, verifier], {
    id: "initialize_money_pot",
    after: [moneyPot],
  })

  // Initialize Pyth if parameters are provided
  const pythInstanceAddress = m.getParameter(
    "pythInstance",
    "0x0000000000000000000000000000000000000000"
  )
  const priceId = m.getParameter(
    "priceId",
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
  )

  // m.call(moneyPot, "initializePyth", [pythInstanceAddress, priceId], {
  //   id: "initialize_pyth",
  //   after: [moneyPotInitialization],
  // })

  // Return the deployed contracts
  return {
    moneyPot,
    underlyingToken,
  }
})

export default MoneyPotModule

// Export types for use in tests and scripts
export type MoneyPotDeployment = {
  moneyPot: MoneyPot
  underlyingToken: MoneyPotToken
}
