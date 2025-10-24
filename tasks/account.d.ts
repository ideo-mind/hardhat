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
