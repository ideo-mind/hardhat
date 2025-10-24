/**
 * Account interface for task management
 * Ported from unreal-hardhat project
 */
export interface Account {
  name: string
  address?: string
  privateKey: string
  metadata: Record<string, string>
}

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  name: string
  chainId: number
  url: string
  ws?: string
  explorer?: string
  faucet?: string | string[]
  confirmations?: number
  gasPrice?: bigint
  gasLimit?: number
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
  tokens?: {
    [tokenName: string]: {
      address: `0x${string}`
      decimals?: number
      faucet?: string[]
    }
  }
}

/**
 * Fund output interface for drip tasks
 */
export interface FundOut {
  address: string
  balance: string
  tokenBal?: string
  newTokenBal?: string
  newBalance?: string
}

/**
 * Output interface for account operations
 */
export interface Out {
  [key: string]: FundOut
}
