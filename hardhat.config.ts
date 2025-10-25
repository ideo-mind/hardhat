import "@nomicfoundation/hardhat-ignition"
import "@nomicfoundation/hardhat-toolbox-viem"

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers"
import keystorePlugin from "@nomicfoundation/hardhat-keystore"
import hardhatVerify from "@nomicfoundation/hardhat-verify"
import hardhatTypechain from "@nomicfoundation/hardhat-typechain"

import type { HardhatUserConfig } from "hardhat/config"
import * as process from "process"
import type { NetworkUserConfig } from "hardhat/types/config"

// import dotenvx from "@dotenvx/dotenvx"
// dotenvx.config()
// import dotenv from "dotenv"
// dotenv.config({ path: "./.env" })

import { ACCOUNT_ADDRESSES, PRIVATE_KEYS } from "./utils/accounts"
// Import tasks
import "./tasks"

let NETWORK = process.env.NETWORK || "hardhat"
const INFURA_KEY = process.env.INFURA_KEY || ""
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || ""

type _Network = NetworkUserConfig & {
  ws?: string
  faucet?: string | Array<string>
  explorer?: string
  confirmations?: number
  evmVersion?: string
  tokens?: {
    [tokenName: string]: {
      address: `0x${string}`
      faucet?: Array<string>
    }
  }
}

const genesisAcc = [
  ...PRIVATE_KEYS.map((privateKey) => {
    return {
      privateKey: privateKey,
      balance: `${1000000000000000000000000n}`,
    }
  }),
]

interface _Config extends HardhatUserConfig {
  networks: {
    [network: string]: _Network
  }
}

const config: _Config = {
  plugins: [
    hardhatToolboxMochaEthersPlugin,
    keystorePlugin,
    hardhatVerify,
    hardhatTypechain,
  ],
  solidity: {
    version: "0.8.28",
    npmFilesToBuild: [
      "@openzeppelin/contracts/token/ERC20/ERC20.sol",
      "@openzeppelin/contracts/token/ERC20/IERC20.sol",
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "london",
      viaIR: true,
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
      tokens: {
        pyUSD: {
          address: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
          faucet: [
            "https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd",
            "https://faucet.paxos.com",
          ],
        },
      },
    },

    // Somnia Testnet network
    somnia: {
      type: "http",
      url: `https://rpc.ankr.com/somnia_testnet/${
        process.env.ANKR_API_KEY ||
        "b538dd90abf174d5a5e91e686b9a0d2bcb80c0531c5d99fe61aa7b2a9720d453"
      }`,
      chainId: 50312,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      explorer: "https://shannon-explorer.somnia.network",
      confirmations: 1,
    },

    // CreditCoin testnet
    cc: {
      type: "http",
      url: "https://rpc.cc3-testnet.creditcoin.network",
      ws: "wss://rpc.cc3-testnet.creditcoin.network",
      chainId: 102031,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      explorer: "https://creditcoin-testnet.blockscout.com",
      faucet: ["<discord url>"],
      confirmations: 1,
      custom: {
        tokens: {
          pyUSD: {
            // stubbed: from unreal token
            address: "0x15EDeBfe6De62Fe4827C00d82e0230566600aF73",
            faucet: [
              "https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd",
              "https://faucet.paxos.com",
            ],
          },
        },
      },
    },
  },

  // Paths configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  chainDescriptors: {
    50312: {
      name: "somnia",
      blockExplorers: {
        etherscan: {
          name: "Somnia Explorer",
          url: "https://shannon-explorer.somnia.network",
          apiUrl: "https://shannon-explorer.somnia.network/api",
        },
      },
    },
  },
  verify: {
    blockscout: {
      enabled: true,
    },
    etherscan: {
      apiKey: {
        cc: "empty",
        somnia: "empty",
        default: process.env.ETHERSCAN_API_KEY,
      },

      customChains: [
        {
          network: "cc",
          chainId: 102031,
          urls: {
            apiURL: "https://creditcoin-testnet.blockscout.com/api",
            browserURL: "https://creditcoin-testnet.blockscout.com",
          },
        },
        {
          network: "somnia",
          chainId: 50312,
          urls: {
            apiURL: "https://shannon-explorer.somnia.network/api",
            browserURL: "https://shannon-explorer.somnia.network",
          },
        },
      ],
    },
    sourcify: {
      // Disabled by default
      // Doesn't need an API key
      enabled: true,
      apiUrl: "https://sourcify.dev/server",
      browserUrl: "https://repo.sourcify.dev",
    },
  },

  // TypeChain configuration
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
  },

  // Ignition configuration
  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 180000,
    maxFeeBumps: 4,
    requiredConfirmations: 1,
    disableFeeBumping: false,
  },
}

export default config

// https://hardhat.org/plugins
