import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

/**
 * MoneyPot deployment module
 *
 * This module deploys the MoneyPot contract with configurable parameters.
 * Parameters can be passed via command line or environment variables.
 *
 * Example deployment:
 * npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network sepolia --parameters ignition/parameters/sepolia.json
 */
const MoneyPotModule = buildModule("MoneyPotModule", (m) => {
  // Get deployment parameters with defaults
  const minimumDeposit = m.getParameter("minimumDeposit", parseEther("0.01")); // 0.01 ETH default
  const maximumDeposit = m.getParameter("maximumDeposit", parseEther("10")); // 10 ETH default
  const feePercentage = m.getParameter("feePercentage", 100n); // 1% default (100 basis points)
  const feeRecipient = m.getParameter("feeRecipient", m.getAccount(4)); // Use account 4 as default fee recipient

  // Log deployment parameters
  console.log("🚀 Deploying MoneyPot with parameters:");
  console.log(`   Minimum Deposit: ${minimumDeposit} wei`);
  console.log(`   Maximum Deposit: ${maximumDeposit} wei`);
  console.log(`   Fee Percentage: ${feePercentage} basis points`);
  console.log(`   Fee Recipient: ${feeRecipient}`);

  // Deploy the MoneyPot contract
  const moneyPot = m.contract("MoneyPot", [
    minimumDeposit,
    maximumDeposit,
    feePercentage,
    feeRecipient,
  ]);

  // Set a descriptive ID for the contract
  m.call(moneyPot, "getPotStats", [], {
    id: "check-initial-stats",
    after: [moneyPot],
  });

  // Return the deployed contract
  return { moneyPot };
});

export default MoneyPotModule;

// Export types for use in tests and scripts
export type MoneyPotDeployment = ReturnType<typeof MoneyPotModule["_deploy"]>;
