import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { formatEther, parseEther, type Address, type WalletClient } from "viem";

/**
 * Deployment helper utilities for MoneyPot contract
 */

export interface DeploymentInfo {
  contractName: string;
  address: Address;
  deploymentTransaction?: string;
  network: string;
  timestamp: number;
  deployer: Address;
  constructorArgs?: any[];
  verified?: boolean;
}

/**
 * Format ETH value for display
 */
export function formatValue(value: bigint): string {
  return `${formatEther(value)} ETH`;
}

/**
 * Log deployment information
 */
export function logDeployment(info: DeploymentInfo): void {
  console.log("\n📋 Deployment Summary");
  console.log("=".repeat(50));
  console.log(`Contract: ${info.contractName}`);
  console.log(`Address: ${info.address}`);
  console.log(`Network: ${info.network}`);
  console.log(`Deployer: ${info.deployer}`);
  console.log(`Timestamp: ${new Date(info.timestamp).toISOString()}`);
  if (info.deploymentTransaction) {
    console.log(`Transaction: ${info.deploymentTransaction}`);
  }
  if (info.verified !== undefined) {
    console.log(`Verified: ${info.verified ? "✅" : "❌"}`);
  }
  console.log("=".repeat(50));
}

/**
 * Get network explorer URL
 */
export function getExplorerUrl(
  network: string,
  address: string,
  type: "address" | "tx" = "address",
): string {
  const explorers: Record<string, string> = {
    sepolia: "https://sepolia.etherscan.io",
    mainnet: "https://etherscan.io",
    "base-sepolia": "https://sepolia.basescan.org",
    somnia: "https://explorer.somnia.network",
    chiliz: "https://scan.chiliz.com",
    localhost: "http://localhost:8545",
    hardhat: "http://localhost:8545",
  };

  const baseUrl = explorers[network] || "";
  if (!baseUrl || baseUrl.includes("localhost")) {
    return "N/A (local network)";
  }

  return `${baseUrl}/${type}/${address}`;
}

/**
 * Wait for confirmations
 */
export async function waitForConfirmations(
  hre: HardhatRuntimeEnvironment,
  txHash: string,
  confirmations: number = 2,
): Promise<void> {
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    return; // No need to wait on local networks
  }

  console.log(`⏳ Waiting for ${confirmations} confirmations...`);
  const publicClient = await hre.viem.getPublicClient();

  await publicClient.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    confirmations,
  });

  console.log(`✅ Transaction confirmed!`);
}

/**
 * Save deployment info to file
 */
export async function saveDeploymentInfo(
  network: string,
  contractName: string,
  address: string,
  constructorArgs?: any[],
): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");

  const deploymentDir = path.join(process.cwd(), "deployments", network);

  // Create directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentInfo = {
    address,
    contractName,
    constructorArgs,
    timestamp: Date.now(),
    network,
  };

  const filePath = path.join(deploymentDir, `${contractName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`💾 Deployment info saved to: ${filePath}`);
}

/**
 * Load deployment info from file
 */
export async function loadDeploymentInfo(
  network: string,
  contractName: string,
): Promise<any | null> {
  const fs = await import("fs");
  const path = await import("path");

  const filePath = path.join(
    process.cwd(),
    "deployments",
    network,
    `${contractName}.json`,
  );

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

/**
 * Get all accounts with labels
 */
export async function getAccounts(hre: HardhatRuntimeEnvironment): Promise<{
  deployer: WalletClient;
  owner: WalletClient;
  user1: WalletClient;
  user2: WalletClient;
  user3: WalletClient;
  feeRecipient: WalletClient;
}> {
  const clients = await hre.viem.getWalletClients();

  return {
    deployer: clients[0],
    owner: clients[0],
    user1: clients[1],
    user2: clients[2],
    user3: clients[3],
    feeRecipient: clients[4],
  };
}

/**
 * Check and log account balances
 */
export async function logAccountBalances(
  hre: HardhatRuntimeEnvironment,
  accounts?: Address[],
): Promise<void> {
  const publicClient = await hre.viem.getPublicClient();
  const walletClients = await hre.viem.getWalletClients();

  const accountsToCheck =
    accounts || walletClients.map((c) => c.account.address);

  console.log("\n💰 Account Balances:");
  console.log("-".repeat(60));

  for (let i = 0; i < accountsToCheck.length; i++) {
    const address = accountsToCheck[i];
    const balance = await publicClient.getBalance({ address });
    const label = getAccountLabel(i);

    console.log(`${label.padEnd(15)} ${address}: ${formatValue(balance)}`);
  }
  console.log("-".repeat(60));
}

/**
 * Get account label by index
 */
function getAccountLabel(index: number): string {
  const labels = ["Deployer", "User1", "User2", "User3", "FeeRecipient"];
  return labels[index] || `Account${index}`;
}

/**
 * Verify contract on Etherscan
 */
export async function verifyContract(
  hre: HardhatRuntimeEnvironment,
  address: string,
  constructorArgs: any[],
): Promise<void> {
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("⚠️  Skipping verification on local network");
    return;
  }

  console.log("\n🔍 Verifying contract on Etherscan...");

  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log("✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  Contract already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }
}

/**
 * Estimate deployment gas
 */
export async function estimateDeploymentGas(
  hre: HardhatRuntimeEnvironment,
  contractFactory: any,
  constructorArgs: any[],
): Promise<bigint> {
  const deploymentData =
    contractFactory.interface.encodeDeploy(constructorArgs);
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();

  const gasEstimate = await publicClient.estimateGas({
    account: deployer.account,
    data: deploymentData as `0x${string}`,
  });

  return gasEstimate;
}

/**
 * Format gas cost in ETH
 */
export async function formatGasCost(
  hre: HardhatRuntimeEnvironment,
  gasUsed: bigint,
): Promise<string> {
  const publicClient = await hre.viem.getPublicClient();
  const gasPrice = await publicClient.getGasPrice();
  const cost = gasUsed * gasPrice;
  return formatValue(cost);
}

/**
 * Create parameter file for Ignition deployment
 */
export async function createParameterFile(
  network: string,
  params: Record<string, any>,
): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");

  const paramDir = path.join(process.cwd(), "ignition", "parameters");

  if (!fs.existsSync(paramDir)) {
    fs.mkdirSync(paramDir, { recursive: true });
  }

  const fileName = `${network}-${Date.now()}.json`;
  const filePath = path.join(paramDir, fileName);

  const parameterContent = {
    MoneyPotModule: params,
  };

  fs.writeFileSync(filePath, JSON.stringify(parameterContent, null, 2));

  console.log(`📝 Parameter file created: ${filePath}`);
  return filePath;
}

/**
 * Parse ETH string to wei
 */
export function parseEthValue(value: string): bigint {
  return parseEther(value);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if address is valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get network configuration
 */
export function getNetworkConfig(network: string): {
  confirmations: number;
  gasPrice?: bigint;
  gasLimit?: number;
} {
  const configs: Record<string, any> = {
    hardhat: {
      confirmations: 1,
      gasLimit: 8000000,
    },
    localhost: {
      confirmations: 1,
      gasLimit: 8000000,
    },
    sepolia: {
      confirmations: 2,
      gasPrice: parseEther("0.00000002"), // 20 gwei
    },
    "base-sepolia": {
      confirmations: 2,
      gasPrice: parseEther("0.000000001"), // 1 gwei
    },
    somnia: {
      confirmations: 2,
      gasPrice: parseEther("0.000000001"), // 1 gwei
    },
    chiliz: {
      confirmations: 2,
      gasPrice: parseEther("0.00000025"), // 25 gwei
    },
  };

  return configs[network] || { confirmations: 2 };
}

/**
 * Log transaction details
 */
export async function logTransactionDetails(
  hre: HardhatRuntimeEnvironment,
  txHash: string,
): Promise<void> {
  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  console.log("\n📄 Transaction Details:");
  console.log("-".repeat(60));
  console.log(`Hash: ${receipt.transactionHash}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed}`);
  console.log(
    `Status: ${receipt.status === "success" ? "✅ Success" : "❌ Failed"}`,
  );
  console.log(
    `Explorer: ${getExplorerUrl(hre.network.name, receipt.transactionHash, "tx")}`,
  );
  console.log("-".repeat(60));
}

/**
 * Export all utilities
 */
export default {
  formatValue,
  logDeployment,
  getExplorerUrl,
  waitForConfirmations,
  saveDeploymentInfo,
  loadDeploymentInfo,
  getAccounts,
  logAccountBalances,
  verifyContract,
  estimateDeploymentGas,
  formatGasCost,
  createParameterFile,
  parseEthValue,
  sleep,
  isValidAddress,
  getNetworkConfig,
  logTransactionDetails,
};
