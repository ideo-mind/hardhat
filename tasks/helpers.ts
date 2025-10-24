import { ethers } from "ethers"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Account } from "../utils/types"
import { getSigner } from "../utils/web3"

/**
 * Transfer ETH to an account
 */
export const transferEther = async (
  acc: Account,
  amountInWei: bigint,
  hre: HardhatRuntimeEnvironment,
  signer: ethers.Signer,
  nonce?: number
) => {
  if (amountInWei === 0n) {
    console.log("ether invalid : 0")
    return
  }

  const tx: any = {
    to: acc.address,
    value: amountInWei,
    nonce,
  }

  if (hre.network.name === "titanAI") {
    tx["gasLimit"] = 100000
  }

  const transactionResponse = await signer.sendTransaction(tx)
  const transactionReceipt = await transactionResponse.wait()
  const { hash: txHash } = transactionReceipt
  console.log(`Transaction successful: ${txHash}`)
}

/**
 * Transfer ERC20 tokens to an account
 */
export const transferToken = async (
  acc: string,
  tokenContract: any,
  hre: HardhatRuntimeEnvironment,
  amt: string,
  nonce?: number
) => {
  const wei = hre.ethers.parseUnits(amt, await tokenContract.decimals())
  if (wei === 0n) {
    console.log("amt invalid : 0")
    return
  }

  const additionalParams: any = {}
  if (nonce) {
    console.log("custom nonce: ", nonce)
    additionalParams["nonce"] = nonce
  }
  if (hre.network.name === "titanAI") {
    additionalParams["gasLimit"] = 100000
  }

  const transferTx = await tokenContract.transfer(acc, wei, additionalParams)
  const transferReceipt = await transferTx.wait()
  const { hash: transferTxHash } = transferReceipt
  console.log(`ERC20 transfer successful: ${transferTxHash}`)
}

/**
 * Get token balance for an address
 */
export const balanceOfToken = async (
  tokenContract: any,
  address: string
): Promise<string> => {
  const tokenBal = await tokenContract.balanceOf(address)
  const tokenDigits = await tokenContract.decimals()
  const tokenBalString = ethers.formatUnits(tokenBal, tokenDigits)
  return tokenBalString
}

/**
 * Get formatted token balance with symbol
 */
export const tokenBal = async (
  tokenContract: any,
  address: string
): Promise<string> => {
  const tokenBal = await balanceOfToken(tokenContract, address)
  const symbol = await tokenContract.symbol()
  return `${tokenBal} ${symbol}`
}

/**
 * Get MoneyPot contract balance for an address
 */
export const balanceOfMoneyPot = async (
  hre: HardhatRuntimeEnvironment,
  signer: ethers.Signer,
  address: string
) => {
  try {
    const moneyPot = await hre.ethers.getContractFactory("MoneyPot")
    // For now, return 0 since we need a deployed instance
    // This will be updated when we have actual deployments
    return "0"
  } catch (error) {
    console.log("MoneyPot contract not found or not deployed")
    return "0"
  }
}
