import "@nomicfoundation/hardhat-toolbox-viem"
import { task } from "hardhat/config"
import { getAccount } from "../utils/accounts"
import { connectMoneyPot } from "../utils/web3"

// Helper function to connect to MoneyPot contract
async function connectMoneyPotContract(hre: any) {
  try {
    const moneyPot = await connectMoneyPot(hre)
    return moneyPot
  } catch (error) {
    console.error("Error connecting to MoneyPot contract:", error)
    throw new Error(
      "MoneyPot contract not found or not deployed. Please deploy it first."
    )
  }
}

task("moneypot:balance", "Get MoneyPot contract balance for an account")
  .addOptionalParam(
    "account",
    "Account to check balance for (defaults to admin)",
    "admin"
  )
  .setAction(async ({ account }, hre) => {
    try {
      const moneyPot = await connectMoneyPotContract(hre)
      const wallet = getAccount(account || "admin")

      // Get contract balance (ETH balance of the contract)
      const contractBalance = await hre.ethers.provider.getBalance(
        await moneyPot.getAddress()
      )

      console.log(`\nAccount: ${wallet.address}`)
      console.log(
        `Contract Balance: ${hre.ethers.formatEther(contractBalance)} ETH`
      )

      // Try to get user's balance in the pot (if the contract has this function)
      try {
        const userBalance = await moneyPot.getBalance(wallet.address)
        console.log(
          `User Balance in Pot: ${hre.ethers.formatEther(userBalance)} ETH`
        )
      } catch (error) {
        console.log(
          "User balance not available (contract may not be deployed or function not available)"
        )
      }
    } catch (error) {
      console.error("Error getting MoneyPot balance:", error)
    }
  })

task("moneypot:stats", "Get MoneyPot contract statistics").setAction(
  async ({}, hre) => {
    try {
      const moneyPot = await connectMoneyPotContract(hre)

      // Get contract balance
      const contractBalance = await hre.ethers.provider.getBalance(
        await moneyPot.getAddress()
      )

      console.log(`\nMoneyPot Contract Statistics:`)
      console.log(`Contract Address: ${await moneyPot.getAddress()}`)
      console.log(
        `Contract Balance: ${hre.ethers.formatEther(contractBalance)} ETH`
      )

      // Try to get pot statistics (if the contract has this function)
      try {
        const stats = await moneyPot.getPotStats()
        console.log(`Total Deposits: ${hre.ethers.formatEther(stats[0])} ETH`)
        console.log(`Total Participants: ${stats[1]}`)
        console.log(
          `Total Fees Collected: ${hre.ethers.formatEther(stats[2])} ETH`
        )
        console.log(
          `Contract Balance (from stats): ${hre.ethers.formatEther(stats[3])} ETH`
        )
      } catch (error) {
        console.log(
          "Pot statistics not available (contract may not be deployed or function not available)"
        )
      }
    } catch (error) {
      console.error("Error getting MoneyPot stats:", error)
    }
  }
)

task("moneypot:deposit", "Deposit ETH into MoneyPot")
  .addPositionalParam("amount", "Amount of ETH to deposit")
  .addOptionalParam(
    "account",
    "Account to use for deposit (defaults to admin)",
    "admin"
  )
  .setAction(
    async ({ amount, account }: { amount: string; account?: string }, hre) => {
      try {
        const moneyPot = await connectMoneyPotContract(hre)
        const wallet = getAccount(account || "admin")
        const signer = await hre.ethers.getSigner(wallet.address!)

        // Parse amount
        const amountWei = hre.ethers.parseEther(amount)

        // Check if user has enough ETH
        const balance = await hre.ethers.provider.getBalance(wallet.address!)

        console.log(`Account: ${wallet.address}`)
        console.log(`Amount: ${amount} ETH`)
        console.log(`Current Balance: ${hre.ethers.formatEther(balance)} ETH`)

        if (balance < amountWei) {
          throw new Error(
            `Insufficient balance. Need ${amount} ETH, have ${hre.ethers.formatEther(balance)} ETH`
          )
        }

        // Deposit ETH
        console.log(`\nDepositing ${amount} ETH into MoneyPot...`)
        const tx = await moneyPot.connect(signer).deposit({ value: amountWei })
        await tx.wait()

        console.log(`✅ Successfully deposited ${amount} ETH into MoneyPot`)
        console.log(`Transaction hash: ${tx.hash}`)
      } catch (error) {
        console.error("Error depositing to MoneyPot:", error)
      }
    }
  )

task("moneypot:withdraw", "Withdraw ETH from MoneyPot")
  .addPositionalParam("amount", "Amount of ETH to withdraw")
  .addOptionalParam(
    "account",
    "Account to use for withdrawal (defaults to admin)",
    "admin"
  )
  .setAction(
    async ({ amount, account }: { amount: string; account?: string }, hre) => {
      try {
        const moneyPot = await connectMoneyPotContract(hre)
        const wallet = getAccount(account || "admin")
        const signer = await hre.ethers.getSigner(wallet.address!)

        // Parse amount
        const amountWei = hre.ethers.parseEther(amount)

        // Check user's balance in the pot
        const userBalance = await moneyPot.getBalance(wallet.address!)

        console.log(`Account: ${wallet.address}`)
        console.log(`Amount: ${amount} ETH`)
        console.log(
          `User Balance in Pot: ${hre.ethers.formatEther(userBalance)} ETH`
        )

        if (userBalance < amountWei) {
          throw new Error(
            `Insufficient balance in pot. Need ${amount} ETH, have ${hre.ethers.formatEther(userBalance)} ETH`
          )
        }

        // Withdraw ETH
        console.log(`\nWithdrawing ${amount} ETH from MoneyPot...`)
        const tx = await moneyPot.connect(signer).withdraw(amountWei)
        await tx.wait()

        console.log(`✅ Successfully withdrew ${amount} ETH from MoneyPot`)
        console.log(`Transaction hash: ${tx.hash}`)
      } catch (error) {
        console.error("Error withdrawing from MoneyPot:", error)
      }
    }
  )

task("moneypot:withdrawAll", "Withdraw all ETH from MoneyPot")
  .addOptionalParam(
    "account",
    "Account to use for withdrawal (defaults to admin)",
    "admin"
  )
  .setAction(async ({ account }: { account?: string }, hre) => {
    try {
      const moneyPot = await connectMoneyPotContract(hre)
      const wallet = getAccount(account || "admin")
      const signer = await hre.ethers.getSigner(wallet.address!)

      // Check user's balance in the pot
      const userBalance = await moneyPot.getBalance(wallet.address!)

      console.log(`Account: ${wallet.address}`)
      console.log(
        `User Balance in Pot: ${hre.ethers.formatEther(userBalance)} ETH`
      )

      if (userBalance === 0n) {
        throw new Error("No balance to withdraw")
      }

      // Withdraw all ETH
      console.log(`\nWithdrawing all ETH from MoneyPot...`)
      const tx = await moneyPot.connect(signer).withdrawAll()
      await tx.wait()

      console.log(`✅ Successfully withdrew all ETH from MoneyPot`)
      console.log(`Transaction hash: ${tx.hash}`)
    } catch (error) {
      console.error("Error withdrawing all from MoneyPot:", error)
    }
  })
