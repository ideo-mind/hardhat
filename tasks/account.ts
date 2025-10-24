import "@nomicfoundation/hardhat-toolbox-viem"
import Wallet1 from "ethereumjs-wallet"
import { task } from "hardhat/config"
import {
  getAccount,
  getAddressFromInput,
  getBalance,
  getBalanceInEther,
  getPublicAddress,
} from "../utils/accounts.js"
import { Account } from "../utils/types.js"
import { getSigner } from "../utils/web3.js"
import { FundOut, Out } from "./account.d.js"
import {
  balanceOfMoneyPot,
  tokenBal,
  transferEther,
  transferToken,
} from "./helpers.js"

// ----- Tasks -----
task("balance", "Prints an account's balance")
  .addPositionalArgument("account", "The account's address or private key")
  .setAction(async (args, hre) => {
    await hre.run("bal", args)
  })

task("bal", "Prints an account's balance")
  .addPositionalArgument("account", "The account address or pkey")
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

task("accounts", "Prints the list of accounts").setAction(
  async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners()
    console.log("Loading accounts")
    for (const account of accounts) {
      const bal = await getBalance(account.address, hre)
      const balString = hre.ethers.formatEther(bal) + " ETH"
      console.log("acc", account.address, balString)
    }
  }
)

task("account", "Prints account address from private key")
  .addPositionalArgument("privateKey", "The private key")
  .setAction(async ({ privateKey }, hre) => {
    const address = getPublicAddress(privateKey, hre)
    console.log("account:", address)
  })

// Temporarily comment out complex tasks to isolate the issue
/*
task("drip", "Drip any address")
  .addPositionalArgument("account", "The address or privateKey to drip to")
  .addOption("eth", "The amount to drip", "0.01")
  .addOption("amt", "The token amount to drip", "0")
  .addOption("nonce", "The starting nonce default value")
  .addOption("tokenAddress", "The Token address defaults to MoneyPot")
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
  .addOption("eth", "The amount to drip", "0.01")
  .addOption("amt", "The amount to drip", "10000")
  .setAction(async ({ eth, amt }, hre) => {
    console.log("network", hre.network.name)
    const wallet = Wallet1.generate()
    const privateKey = wallet.getPrivateKeyString()
    console.log(`export PRIVATE_KEY=${privateKey}`)
    await hre.run("drip", { account: privateKey, eth, amt })
  })
*/
