import * as dotenv from "dotenv"
import { Address, getAddress, Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { ethers } from "ethers"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Account } from "./types"

// Load environment variables
dotenv.config()

/**
 * Default test private key (from Hardhat's default first account)
 * DO NOT USE IN PRODUCTION!
 */
const DEFAULT_TEST_PRIVATE_KEY: Hex =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

/**
 * Load private keys from environment variables
 * Supports ADMIN_PRIVATE_KEY and VERIFIER_PRIVATE_KEY
 */
function loadPrivateKeys(): Hex[] {
  const keys: Set<Hex> = new Set()

  // Add admin key if available
  if (process.env.ADMIN_PRIVATE_KEY) {
    const adminKey = formatPrivateKey(process.env.ADMIN_PRIVATE_KEY)
    if (adminKey) keys.add(adminKey)
  }

  // Add verifier key if available
  if (process.env.VERIFIER_PRIVATE_KEY) {
    const verifierKey = formatPrivateKey(process.env.VERIFIER_PRIVATE_KEY)
    if (verifierKey) keys.add(verifierKey)
  }

  // Use default test key if no valid keys found
  if (keys.size === 0) {
    const isProduction = process.env.NODE_ENV === "production"

    if (isProduction) {
      throw new Error("No private keys configured for production deployment!")
    }

    console.log("⚠️  No private keys found. Using default test key.")
    console.log("⚠️  DO NOT use this key in production!")
    keys.add(DEFAULT_TEST_PRIVATE_KEY)
  }

  return Array.from(keys)
}

/**
 * Format and validate a private key
 */
function formatPrivateKey(key: string): Hex | null {
  try {
    // Ensure key starts with 0x
    if (!key.startsWith("0x")) {
      key = `0x${key}`
    }

    // Validate key length (64 hex characters + 0x prefix = 66 total)
    if (key.length !== 66) {
      console.warn(
        `⚠️  Invalid private key length: ${key.length}. Expected 66 characters.`
      )
      return null
    }

    // Validate hex format
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      console.warn(`⚠️  Invalid private key format.`)
      return null
    }

    return key as Hex
  } catch (error) {
    console.error("Error formatting private key:", error)
    return null
  }
}

/**
 * Generate account addresses from private keys
 */
function generateAccountAddresses(privateKeys: Hex[]): Record<string, Address> {
  const accounts: Record<string, Address> = {}

  privateKeys.forEach((key, index) => {
    try {
      const account = privateKeyToAccount(key)
      const address = getAddress(account.address)

      // Named accounts
      switch (index) {
        case 0:
          // Admin account
          accounts.deployer = address
          accounts.owner = address
          accounts.admin = address
          break
        case 1:
          // Verifier account
          accounts.verifier = address
          accounts.operator = address
          break
      }

      // Numbered accounts
      accounts[`account${index}`] = address
    } catch (error) {
      console.error(
        `Error generating address from private key ${index}:`,
        error
      )
    }
  })

  return accounts
}

// Export private keys array (matching unreal-hardhat)
export const PRIVATE_KEYS: Hex[] = loadPrivateKeys()

// Export account addresses (matching unreal-hardhat)
export const ACCOUNT_ADDRESSES: Record<string, Address> =
  generateAccountAddresses(PRIVATE_KEYS)

// Export individual account addresses for convenience
export const DEPLOYER = ACCOUNT_ADDRESSES.deployer
export const OWNER = ACCOUNT_ADDRESSES.owner
export const ADMIN = ACCOUNT_ADDRESSES.admin
export const VERIFIER = ACCOUNT_ADDRESSES.verifier || ACCOUNT_ADDRESSES.deployer
export const OPERATOR = ACCOUNT_ADDRESSES.operator || ACCOUNT_ADDRESSES.deployer

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

/**
 * Get account by name (ethers v6 compatible)
 */
export function getAccount(name: string): Account {
  const address = ACCOUNT_ADDRESSES[name]
  if (!address) {
    throw new Error(`Unknown account ${name}`)
  }

  // Find the private key for this account
  const privateKey = PRIVATE_KEYS.find((key) => {
    try {
      const account = privateKeyToAccount(key)
      return getAddress(account.address) === getAddress(address)
    } catch {
      return false
    }
  })

  if (!privateKey) {
    throw new Error(`Private key not found for account ${name}`)
  }

  return {
    name,
    address,
    privateKey,
    metadata: {},
  }
}

/**
 * Get address from address or private key (ethers v6 compatible)
 */
export function getAddressFromInput(addressOrKey: string): string {
  try {
    // Check if it's already a valid address
    if (ethers.isAddress(addressOrKey)) {
      return ethers.getAddress(addressOrKey)
    }

    // Try to derive address from private key
    const wallet = new ethers.Wallet(addressOrKey)
    return wallet.address
  } catch (error) {
    throw new Error(
      "Invalid input: not a valid Ethereum address or private key"
    )
  }
}

/**
 * Get balance using ethers v6 (for tasks)
 */
export async function getBalance(
  account: string,
  hre: HardhatRuntimeEnvironment
): Promise<bigint> {
  const balance = await hre.ethers.provider.getBalance(account)
  return balance
}

/**
 * Format ether balance
 */
export function formatEther(balance: bigint): string {
  return ethers.formatEther(balance)
}

/**
 * Get balance in ether (for tasks)
 */
export async function getBalanceInEther(
  account: string,
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  return formatEther(await getBalance(account, hre))
}

/**
 * Get public address from private key (ethers v6 compatible)
 */
export function getPublicAddress(
  privateKey: string,
  hre?: HardhatRuntimeEnvironment
): string {
  const wallet = new ethers.Wallet(privateKey)
  return wallet.address
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
