import { Account } from "./types"
import { privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"
import * as process from "process"
import { HardhatRuntimeEnvironment } from "hardhat/types/hre"
import { Wallet } from "ethers5"

let useDefaultValue = true

export function setDefaultValue(flag: boolean) {
  useDefaultValue = flag
  // console.debug("set default value to ", flag)
}

export const loadEnv = (name: string, defaultValue: string) => {
  const pKey = process.env[name]
  if (pKey) {
    return pKey
  }
  console.error(
    `Environment variable ${name} not found, using default value ${defaultValue}`
  )
  console.debug("hardhat value be careful!!")
  if (useDefaultValue) {
    return defaultValue
  }

  return ""
}

export const loadPrivateKey = (name: string, defaultValue: string) => {
  return loadEnv(`${name.toUpperCase()}_PRIVATE_KEY`, defaultValue).trim()
}

export const loadAddress = (name: string, privateKey: string) => {
  let address: string

  try {
    const wallet = new Wallet(privateKey)
    address = wallet.address
    console.debug(name + ": " + address)
  } catch (error: any) {
    console.error(
      `Error deriving address from private key for ${name}: ${error.message}`
    )
    process.exit(1)
  }

  return address
}

// the default values here are the hardhat default insecure accounts
// this means that we get a reproducible dev environment between hardhat and geth
export const ACCOUNTS: Account[] = [
  {
    name: "admin",
    privateKey: loadPrivateKey(
      "admin",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    ),
    metadata: {},
  },
  {
    name: "verifier",
    privateKey: loadPrivateKey(
      "verifier",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    ),
    metadata: {},
  },
  {
    name: "",
    privateKey: loadEnv(
      "PRIVATE_KEY",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    ),
    metadata: {},
  },
].map((account: Account) => {
  // Check if the address is not already present
  if (!account.address) {
    // Derive the address using the loadAddress function
    account.address = loadAddress(account.name, account.privateKey)
  }
  return account
})

// map of account name -> account
export const NAMED_ACCOUNTS = ACCOUNTS.reduce<Record<string, Account>>(
  (all, acc) => {
    all[acc.name] = acc
    return all
  },
  {}
)

// map of account name -> account address
export const ACCOUNT_ADDRESSES = ACCOUNTS.reduce<Record<string, string>>(
  (all, acc) => {
    all[acc.name] = acc.address
    return all
  },
  {}
)

// flat list of private keys in order
export const PRIVATE_KEYS = ACCOUNTS.map((acc) => acc.privateKey)

// Export individual account addresses for convenience
export const DEPLOYER = ACCOUNT_ADDRESSES.admin
export const OWNER = ACCOUNT_ADDRESSES.admin
export const ADMIN = ACCOUNT_ADDRESSES.admin
export const VERIFIER = ACCOUNT_ADDRESSES.verifier || ACCOUNT_ADDRESSES.admin
export const OPERATOR = ACCOUNT_ADDRESSES.verifier || ACCOUNT_ADDRESSES.admin

export const getAccount = (name: string) => {
  const account = NAMED_ACCOUNTS[name]
  if (!account) {
    throw new Error(`Unknown account ${name}`)
  }
  return account
}

export async function getBalance(
  account: string,
  hre: HardhatRuntimeEnvironment
) {
  // Try to use ethers if available, otherwise use viem
  try {
    // @ts-ignore - ethers might be available through the plugin
    const balance = await hre.ethers.provider.getBalance(account)
    return balance
  } catch (error) {
    // Fallback to viem if ethers is not available
    try {
      // @ts-ignore - viem might be available through the plugin
      const balance = await hre.viem.getPublicClient().getBalance({
        address: account as `0x${string}`,
      })
      return balance
    } catch (viemError) {
      throw new Error("Neither ethers nor viem provider available")
    }
  }
}

export function formatEther(balance: bigint) {
  // Convert bigint to string and format as ether
  return (Number(balance) / 1e18).toString()
}

export async function getBalanceInEther(
  account: string,
  hre: HardhatRuntimeEnvironment
) {
  return formatEther(await getBalance(account, hre))
}

export function getPublicAddress(
  privateKey: string,
  hre?: HardhatRuntimeEnvironment
): string {
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    return getAddress(account.address)
  } catch (error) {
    console.error("Error deriving address from private key:", error)
    throw new Error("Invalid private key")
  }
}

export function getAddressFromInput(addressOrPrivateKey: string): string {
  try {
    // Check if it's already a valid address
    if (getAddress(addressOrPrivateKey)) {
      return getAddress(addressOrPrivateKey)
    }

    // Try to derive address from private key
    const account = privateKeyToAccount(addressOrPrivateKey as `0x${string}`)
    return getAddress(account.address)
  } catch (error) {
    throw new Error(
      "Invalid input: not a valid Ethereum address or private key"
    )
  }
}

/**
 * Log account information
 */
export function logAccounts(): void {
  console.log("\n📊 Account Addresses:")
  console.log("=".repeat(60))

  if (DEPLOYER) console.log(`Admin/Deployer: ${DEPLOYER}`)
  if (VERIFIER && VERIFIER !== DEPLOYER)
    console.log(`Verifier/Operator: ${VERIFIER}`)

  console.log("=".repeat(60))
  console.log(`Total: ${PRIVATE_KEYS.length} account(s)\n`)
}

// Auto-log accounts in verbose mode
if (process.env.VERBOSE === "true") {
  logAccounts()
}

export default {
  PRIVATE_KEYS,
  ACCOUNT_ADDRESSES,
  DEPLOYER,
  OWNER,
  ADMIN,
  VERIFIER,
  OPERATOR,
  logAccounts,
  getAccount,
  getAddressFromInput,
  getBalance,
  getBalanceInEther,
  getPublicAddress,
}
