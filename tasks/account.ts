import "@nomicfoundation/hardhat-toolbox-viem"
import Wallet1 from "ethereumjs-wallet"
import { task } from "hardhat/config"
import {
  getAccount,
  getAddressFromInput,
  getBalance,
  getBalanceInEther,
  getPublicAddress,
} from "../utils/accounts"
import { Account } from "../utils/types"
import { getSigner } from "../utils/web3"
import { FundOut, Out } from "./account.d"
import {
  balanceOfMoneyPot,
  tokenBal,
  transferEther,
  transferToken,
} from "./helpers"

// ----- Tasks -----
task("balance", "Prints an account's balance")
  .addPositionalParam("account", "The account's address or private key")
  .setAction(async (args, hre) => {
    await hre.run("bal", args)
  })

task("bal", "Prints an account's balance")
  .addPositionalParam("account", "The account address or pkey")
  .setAction(async ({ account }, hre) => {
    console.log("network", hre.network.name)
    const address = getAddressFromInput(account)
    const balance = await getBalance(address, hre)
    const signer = await hre.ethers.getSigner(address)
    const out = [
      {
        account: address,
        balance: hre.ethers.formatEther(balance),
        tokenBal: await balanceOfMoneyPot(hre, signer, address),
        nonce: await signer.getNonce("pending"),
      },
    ]
    console.table(out)
  })

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()
  console.log("Loading accounts")
  for (const account of accounts) {
    const bal = await getBalance(account.address, hre)
    const balString = hre.ethers.formatEther(bal) + " ETH"
    console.log("acc", account.address, balString)
  }
})

task("account", "Prints account address from private key")
  .addPositionalParam("privateKey", "The private key")
  .setAction(async ({ privateKey }, hre) => {
    const address = getPublicAddress(privateKey, hre)
    console.log("account:", address)
  })

task("drip", "Drip any address")
  .addPositionalParam("account", "The address or privateKey to drip to")
  .addOptionalPositionalParam("eth", "The amount to drip", "0.01")
  .addOptionalPositionalParam("amt", "The token amount to drip", "0")
  .addOptionalPositionalParam("nonce", "The starting nonce default value")
  .addOptionalParam("tokenAddress", "The Token address defaults to MoneyPot")
  .setAction(
    async ({ account, eth, amt, nonce: startNonce, tokenAddress }, hre) => {
      console.log("network", hre.network.name)

      const fundingAccount = getAccount("admin")
      const address = getAddressFromInput(account)
      console.log({ address })
      const signer = await hre.ethers.getSigner(fundingAccount.address!)

      let nonce = startNonce
        ? Number.parseInt(startNonce)
        : await signer.getNonce()
      console.log("nonce", nonce)

      const getNonce = (): number => {
        nonce += 1
        return nonce - 1
      }

      const bal = async (address: string): Promise<string> => {
        if (amt == 0) return "0"
        // For now, return 0 since we don't have a deployed token
        return "0"
      }

      const ethBal = async (address: string) =>
        await getBalanceInEther(address, hre)

      const amountInWei = hre.ethers.parseEther(eth)
      if (amountInWei === 0n) {
        nonce--
      }

      let out: Out = {
        admin: {
          address: fundingAccount.address!,
          balance: await getBalanceInEther(fundingAccount.address!, hre),
          tokenBal: await bal(fundingAccount.address!),
        },
      }

      const acc: Account = {
        name: "dev",
        address: address,
      }

      const out_: FundOut = {
        address: acc.address!,
        balance: await ethBal(acc.address!),
        tokenBal: await bal(acc.address!),
      }

      out[acc.name] = out_

      let promises = [
        transferEther(acc, amountInWei, hre, signer, getNonce()),
        // Skip token transfer for now since we don't have deployed tokens
      ]

      if (hre.network.name === "titanAI") {
        promises = promises.map(async (p) => await p)
      }

      const results = await Promise.allSettled(promises)
      results.forEach((result, index) => {
        const transferType = index === 0 ? "Ether" : "Token"
        if (result.status === "fulfilled") {
          console.log(`${transferType} successful and returned ${result.value}`)
        } else {
          console.error(
            `${transferType} transfer encountered an error:`,
            result.reason
          )
        }
      })

      out_.newTokenBal = await bal(acc.address!)
      out_.newBalance = await ethBal(acc.address!)
      out.admin.newBalance = await getBalanceInEther(
        fundingAccount.address!,
        hre
      )
      out.admin.newTokenBal = await bal(fundingAccount.address!)

      console.log(`NETWORK=${hre.network.name}`)
      console.table(out)
    }
  )

task("new-wallet", "New Wallet, optional drip")
  .addOptionalPositionalParam("eth", "The amount to drip", "0.01")
  .addOptionalPositionalParam("amt", "The amount to drip", "10000")
  .setAction(async ({ eth, amt }, hre) => {
    console.log("network", hre.network.name)
    const wallet = Wallet1.generate()
    const privateKey = wallet.getPrivateKeyString()
    console.log(`export PRIVATE_KEY=${privateKey}`)
    await hre.run("drip", { account: privateKey, eth, amt })
  })
