import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import * as process from "process";

// Load environment variables
const ENV_FILE = process.env.CONFIG || "./.env";
console.log(`ENV_FILE is ${ENV_FILE}`);
dotenv.config({ path: ENV_FILE });

import { NetworkUserConfig } from "hardhat/types";
import { ACCOUNT_ADDRESSES, PRIVATE_KEYS } from "./utils/accounts";

let NETWORK = process.env.NETWORK || "hardhat";
const INFURA_KEY = process.env.INFURA_KEY || "";
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "";

type _Network = NetworkUserConfig & {
  ws?: string;
  faucet?: string | Array<string>;
  explorer?: string;
  confirmations?: number;
  evmVersion?: string;
};

const genesisAcc = [
  ...PRIVATE_KEYS.map((privateKey) => {
    return {
      privateKey: privateKey,
      balance: `${1000000000000000000000000n}`,
    };
  }),
];

interface _Config extends HardhatUserConfig {
  networks: {
    [network: string]: _Network;
  };
}

const config: _Config = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "london",
      viaIR: false,
    },
  },
  defaultNetwork: NETWORK,
  namedAccounts: ACCOUNT_ADDRESSES,

  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
      allowBlocksWithSameTimestamp: true,
      mining: {
        auto: true,
        interval: 0,
      },
      accounts: genesisAcc,
    },

    localhost: {
      type: "http",
      url: "http://localhost:8545",
      ws: "ws://localhost:8546",
      chainId: 31337,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
    },

    // Sepolia testnet
    sepolia: {
      type: "http",
      url: ALCHEMY_KEY
        ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : INFURA_KEY
          ? `https://sepolia.infura.io/v3/${INFURA_KEY}`
          : "https://rpc.sepolia.org",
      ws: INFURA_KEY
        ? `wss://sepolia.infura.io/ws/v3/${INFURA_KEY}`
        : undefined,
      chainId: 11155111,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      explorer: "https://sepolia.etherscan.io",
      confirmations: 2,
    },

    // Somnia network
    somnia: {
      type: "http",
      url: "https://dream-rpc.somnia.network",
      chainId: 50311,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      explorer: "https://explorer.somnia.network",
      confirmations: 1,
    },

    // Chiliz Chain
    cc: {
      type: "http",
      url: "https://rpc.ankr.com/chiliz",
      chainId: 88888,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      explorer: "https://scan.chiliz.com",
      confirmations: 1,
    },
  },

  // Paths configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Ignition configuration
  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeeBumps: 4,
    requiredConfirmations: 1,
    disableFeeBumping: false,
  },
};

// Log configuration info
console.log(`🔧 Default Network: ${NETWORK}`);
console.log(`🔑 Loaded ${PRIVATE_KEYS.length} account(s)`);
if (INFURA_KEY) console.log(`📡 Using Infura API`);
if (ALCHEMY_KEY) console.log(`⚗️ Using Alchemy API`);

export default config;
