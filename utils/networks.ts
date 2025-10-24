import * as dotenv from "dotenv";
import { Chain, defineChain } from "viem";
import { hardhat, localhost, sepolia } from "viem/chains";

// Load environment variables
dotenv.config();

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  name: string;
  chainId: number;
  url: string;
  ws?: string;
  explorer?: string;
  faucet?: string | string[];
  confirmations?: number;
  gasPrice?: bigint;
  gasLimit?: number;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  tokens?: {
    [tokenName: string]: {
      address: `0x${string}`;
      decimals?: number;
      faucet?: string[];
    };
  };
}

/**
 * Get RPC URL from environment or use default
 */
function getRpcUrl(network: string, defaultUrl?: string): string {
  // Check multiple environment variable formats
  const envKeys = [
    `${network.toUpperCase()}_RPC_URL`,
    `${network.toUpperCase()}_RPC`,
    `${network.toUpperCase()}_URL`,
    `RPC_${network.toUpperCase()}`,
  ];

  for (const key of envKeys) {
    if (process.env[key]) {
      return process.env[key]!;
    }
  }

  // Check for Infura key for supported networks
  const infuraKey = process.env.INFURA_KEY || process.env.INFURA_API_KEY;
  if (infuraKey) {
    const infuraNetworks: Record<string, string> = {
      sepolia: `https://sepolia.infura.io/v3/${infuraKey}`,
      mainnet: `https://mainnet.infura.io/v3/${infuraKey}`,
      goerli: `https://goerli.infura.io/v3/${infuraKey}`,
      arbitrum: `https://arbitrum-mainnet.infura.io/v3/${infuraKey}`,
      optimism: `https://optimism-mainnet.infura.io/v3/${infuraKey}`,
      polygon: `https://polygon-mainnet.infura.io/v3/${infuraKey}`,
    };

    if (infuraNetworks[network.toLowerCase()]) {
      return infuraNetworks[network.toLowerCase()];
    }
  }

  // Check for Alchemy key for supported networks
  const alchemyKey = process.env.ALCHEMY_KEY || process.env.ALCHEMY_API_KEY;
  if (alchemyKey) {
    const alchemyNetworks: Record<string, string> = {
      sepolia: `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
      mainnet: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      goerli: `https://eth-goerli.g.alchemy.com/v2/${alchemyKey}`,
      arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      optimism: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      polygon: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      base: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      "base-sepolia": `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`,
    };

    if (alchemyNetworks[network.toLowerCase()]) {
      return alchemyNetworks[network.toLowerCase()];
    }
  }

  // Use default URL if provided
  if (defaultUrl) {
    return defaultUrl;
  }

  throw new Error(`No RPC URL configured for network: ${network}`);
}

/**
 * Get WebSocket URL for a network
 */
function getWsUrl(network: string): string | undefined {
  // Check environment variables
  const envKeys = [
    `${network.toUpperCase()}_WS_URL`,
    `${network.toUpperCase()}_WS`,
    `${network.toUpperCase()}_WSS`,
    `WS_${network.toUpperCase()}`,
  ];

  for (const key of envKeys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }

  // Check for Infura WebSocket
  const infuraKey = process.env.INFURA_KEY || process.env.INFURA_API_KEY;
  if (infuraKey) {
    const infuraWsNetworks: Record<string, string> = {
      sepolia: `wss://sepolia.infura.io/ws/v3/${infuraKey}`,
      mainnet: `wss://mainnet.infura.io/ws/v3/${infuraKey}`,
      goerli: `wss://goerli.infura.io/ws/v3/${infuraKey}`,
      arbitrum: `wss://arbitrum-mainnet.infura.io/ws/v3/${infuraKey}`,
      optimism: `wss://optimism-mainnet.infura.io/ws/v3/${infuraKey}`,
      polygon: `wss://polygon-mainnet.infura.io/ws/v3/${infuraKey}`,
    };

    if (infuraWsNetworks[network.toLowerCase()]) {
      return infuraWsNetworks[network.toLowerCase()];
    }
  }

  return undefined;
}

/**
 * Network configurations
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  hardhat: {
    name: "hardhat",
    chainId: 31337,
    url: "http://127.0.0.1:8545",
    ws: "ws://127.0.0.1:8545",
    confirmations: 1,
    gasPrice: BigInt(8000000000), // 8 gwei
    gasLimit: 8000000,
  },

  localhost: {
    name: "localhost",
    chainId: 31337,
    url: "http://127.0.0.1:8545",
    ws: "ws://127.0.0.1:8545",
    confirmations: 1,
    gasPrice: BigInt(8000000000), // 8 gwei
    gasLimit: 8000000,
  },

  sepolia: {
    name: "sepolia",
    chainId: 11155111,
    url: getRpcUrl("sepolia", "https://rpc.sepolia.org"),
    ws: getWsUrl("sepolia") || "wss://sepolia.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    faucet: [
      "https://sepoliafaucet.com",
      "https://faucet.sepolia.dev",
      "https://faucet.paradigm.xyz",
      "https://sepolia-faucet.pk910.de",
    ],
    confirmations: process.env.CONFIRMATIONS ? parseInt(process.env.CONFIRMATIONS) : 2,
    gasPrice: BigInt(20000000000), // 20 gwei
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    tokens: {
      USDC: {
        address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
        decimals: 6,
        faucet: ["https://faucet.circle.com"],
      },
      DAI: {
        address: "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
        decimals: 18,
      },
      WETH: {
        address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
        decimals: 18,
      },
    },
  },

  mainnet: {
    name: "mainnet",
    chainId: 1,
    url: getRpcUrl("mainnet", "https://eth.llamarpc.com"),
    ws: getWsUrl("mainnet"),
    explorer: "https://etherscan.io",
    confirmations: process.env.CONFIRMATIONS ? parseInt(process.env.CONFIRMATIONS) : 6,
    gasPrice: BigInt(30000000000), // 30 gwei
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },

  // Base Sepolia (as mentioned in unreal-hardhat)
  "base-sepolia": {
    name: "base-sepolia",
    chainId: 84532,
    url: getRpcUrl("base-sepolia", "https://sepolia.base.org"),
    ws: "wss://base-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.basescan.org",
    faucet: [
      "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet",
      "https://faucet.quicknode.com/base/sepolia",
    ],
    confirmations: process.env.CONFIRMATIONS ? parseInt(process.env.CONFIRMATIONS) : 2,
    gasPrice: BigInt(1000000000), // 1 gwei
    nativeCurrency: {
      name: "Base Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

/**
 * Get network configuration by name
 */
export function getNetworkConfig(networkName: string): NetworkConfig {
  const network = NETWORKS[networkName.toLowerCase()];
  if (!network) {
    throw new Error(`Network configuration not found for: ${networkName}`);
  }
  return network;
}

/**
 * Get chain configuration for viem
 */
export function getChain(networkName: string): Chain {
  const network = networkName.toLowerCase();

  // Return predefined chains from viem
  switch (network) {
    case "sepolia":
      return sepolia;
    case "hardhat":
      return hardhat;
    case "localhost":
      return localhost;
    default:
      // Create custom chain for other networks
      const config = getNetworkConfig(network);
      return defineChain({
        id: config.chainId,
        name: config.name,
        nativeCurrency: config.nativeCurrency || {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [config.url],
            webSocket: config.ws ? [config.ws] : undefined,
          },
        },
        blockExplorers: config.explorer
          ? {
              default: {
                name: `${config.name} Explorer`,
                url: config.explorer,
              },
            }
          : undefined,
      });
  }
}

/**
 * Check if network is a testnet
 */
export function isTestnet(networkName: string): boolean {
  const testnets = [
    "sepolia",
    "goerli",
    "hardhat",
    "localhost",
    "base-sepolia",
    "arbitrum-sepolia",
    "optimism-sepolia",
    "polygon-amoy",
  ];
  return testnets.includes(networkName.toLowerCase());
}

/**
 * Check if network is local
 */
export function isLocalNetwork(networkName: string): boolean {
  return ["hardhat", "localhost"].includes(networkName.toLowerCase());
}

/**
 * Get block confirmations for network
 */
export function getConfirmations(networkName: string): number {
  const network = getNetworkConfig(networkName);
  return network.confirmations || (isLocalNetwork(networkName) ? 1 : 2);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(networkName: string, txHash: string): string | undefined {
  const network = getNetworkConfig(networkName);
  if (network.explorer) {
    return `${network.explorer}/tx/${txHash}`;
  }
  return undefined;
}

/**
 * Get explorer URL for an address
 */
export function getExplorerAddressUrl(networkName: string, address: string): string | undefined {
  const network = getNetworkConfig(networkName);
  if (network.explorer) {
    return `${network.explorer}/address/${address}`;
  }
  return undefined;
}

/**
 * Get faucet URLs for a network
 */
export function getFaucetUrls(networkName: string): string[] {
  const network = getNetworkConfig(networkName);
  if (network.faucet) {
    return Array.isArray(network.faucet) ? network.faucet : [network.faucet];
  }
  return [];
}

/**
 * Log network information
 */
export function logNetworkInfo(networkName: string): void {
  const network = getNetworkConfig(networkName);
  console.log(`\n🌐 Network: ${network.name}`);
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   RPC URL: ${network.url}`);
  if (network.ws) {
    console.log(`   WebSocket: ${network.ws}`);
  }
  if (network.explorer) {
    console.log(`   Explorer: ${network.explorer}`);
  }
  if (network.faucet) {
    const faucets = Array.isArray(network.faucet) ? network.faucet : [network.faucet];
    console.log(`   Faucets:`);
    faucets.forEach(f => console.log(`     - ${f}`));
  }
  console.log("");
}

// Export commonly used chains
export { hardhat, localhost, sepolia } from "viem/chains";

