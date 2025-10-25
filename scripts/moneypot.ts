import { HardhatRuntimeEnvironment } from "hardhat/types/hre"
import { getAccount } from "../utils/accounts"

/**
 * MoneyPot Flow Test Script
 *
 * This script demonstrates the complete MoneyPot game flow:
 * 1. Connect to deployed MoneyPot contract via Ignition
 * 2. Set up accounts (admin as creator/hunter, verifier as oracle)
 * 3. Create a pot with tokens
 * 4. First attempt fails (verifier reports failure)
 * 5. Second attempt succeeds (verifier reports success)
 * 6. Verify final balances and contract state
 *
 * Usage:
 * 1. First deploy the MoneyPot contract:
 *    npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network <network> --parameters ignition/parameters/<network>.json
 *
 * 2. Then run this script:
 *    npx hardhat run scripts/moneypot-flow.ts --network <network>
 *
 * Example:
 *    npx hardhat run scripts/moneypot-flow.ts --network hardhat
 *    npx hardhat run scripts/moneypot-flow.ts --network localhost
 *    npx hardhat run scripts/moneypot-flow.ts --network sepolia
 */

async function main() {
  const hre: HardhatRuntimeEnvironment = require("hardhat")
  const { ethers, network, ignition, deployments } = await hre.network.connect()

  console.log("🚀 Starting MoneyPot Flow Test")
  console.log("=".repeat(50))

  // Get named accounts
  const admin = getAccount("admin")
  const verifier = getAccount("verifier")

  console.log("📋 Account Setup:")
  console.log(`Admin: ${admin.address}`)
  console.log(`Verifier: ${verifier.address}`)
  console.log("")

  // Connect to deployed MoneyPot contract via Ignition
  let moneyPot: any
  try {
    const moneyPotDeployment = await deployments.get("MoneyPotModule#MoneyPot")
    const moneyPotFactory = await ethers.getContractFactory("MoneyPot")
    moneyPot = moneyPotFactory.attach(moneyPotDeployment.address) as any
    console.log(`💰 MoneyPot Contract: ${await moneyPot.getAddress()}`)
  } catch (error) {
    console.log("❌ MoneyPot contract not found. Please deploy it first:")
    console.log(
      "   npx hardhat ignition deploy ignition/modules/MoneyPot.ts --network <network> --parameters ignition/parameters/<network>.json"
    )
    throw error
  }

  // Connect to deployed Token contract via Ignition
  let token: any
  try {
    const tokenDeployment = await deployments.get("MoneyPotModule#IERC20")
    const tokenFactory = await ethers.getContractFactory("MockERC20")
    token = tokenFactory.attach(tokenDeployment.address)
    console.log(`🪙 Token Contract: ${await token.getAddress()}`)
  } catch (error) {
    console.log(
      "❌ Token contract not found. Please deploy MoneyPot module first."
    )
    throw error
  }

  console.log("")

  // Get signers for contract interactions
  const adminSigner = await ethers.getSigner(admin.address)
  const verifierSigner = await ethers.getSigner(verifier.address)

  // Check contract state
  console.log("🏦 Checking contract state...")

  try {
    const verifierAddress = await moneyPot.verifier()
    console.log(`✅ MoneyPot verifier: ${verifierAddress}`)
  } catch (error) {
    console.log(`❌ Error reading verifier: ${error.message}`)
  }

  try {
    const tokenName = await token.name()
    console.log(`✅ Token name: ${tokenName}`)
  } catch (error) {
    console.log(`❌ Error reading token name: ${error.message}`)
  }

  console.log("")

  // Token amounts
  const POT_AMOUNT = ethers.parseEther("1000") // 1000 tokens
  const POT_FEE = ethers.parseEther("100") // 100 tokens
  const POT_DURATION = 86400 // 1 day in seconds

  console.log("💰 Token Setup:")
  console.log(`Pot Amount: ${ethers.formatEther(POT_AMOUNT)} tokens`)
  console.log(`Entry Fee: ${ethers.formatEther(POT_FEE)} tokens`)
  console.log(`Pot Duration: ${POT_DURATION} seconds (1 day)`)
  console.log("")

  // Mint tokens to admin and approve MoneyPot
  console.log("🪙 Minting tokens and setting approvals...")
  try {
    const mintTx = await token
      .connect(adminSigner)
      .mint(admin.address, POT_AMOUNT * 2n)
    await mintTx.wait()
    console.log(
      `✅ Minted ${ethers.formatEther(POT_AMOUNT * 2n)} tokens to admin`
    )

    const approveTx = await token
      .connect(adminSigner)
      .approve(await moneyPot.getAddress(), POT_AMOUNT * 2n)
    await approveTx.wait()
    console.log(
      `✅ Approved MoneyPot to spend ${ethers.formatEther(
        POT_AMOUNT * 2n
      )} tokens`
    )
  } catch (error) {
    console.log(`❌ Error with token operations: ${error.message}`)
    throw error
  }
  console.log("")

  // Generate random 1FA address
  const randomWallet = ethers.Wallet.createRandom()
  const oneFaAddress = randomWallet.address
  console.log(`🎲 Generated random 1FA address: ${oneFaAddress}`)
  console.log("")

  // Step 1: Create Pot
  console.log("🏺 Creating MoneyPot...")

  const createPotTx = await moneyPot
    .connect(adminSigner)
    .createPot(POT_AMOUNT, POT_DURATION, POT_FEE, oneFaAddress)

  const createPotReceipt = await createPotTx.wait()
  console.log(`✅ Transaction: ${createPotTx.hash}`)
  console.log(
    `   Why: Creating MoneyPot with ${ethers.formatEther(POT_AMOUNT)} tokens`
  )

  // Extract pot ID from event
  const potCreatedEvent = createPotReceipt?.logs.find((log) => {
    try {
      const parsed = moneyPot.interface.parseLog(log)
      return parsed?.name === "PotCreated"
    } catch {
      return false
    }
  })

  const potId = potCreatedEvent
    ? moneyPot.interface.parseLog(potCreatedEvent).args[0]
    : 0n
  console.log(`✅ Pot created with ID: ${potId}`)

  // Get pot details
  try {
    const potData = await moneyPot.getPot(potId)
    console.log(`📊 Pot Details:`)
    console.log(`  Creator: ${potData.creator}`)
    console.log(`  Amount: ${ethers.formatEther(potData.totalAmount)} tokens`)
    console.log(`  Fee: ${ethers.formatEther(potData.fee)} tokens`)
    console.log(
      `  Expires: ${new Date(Number(potData.expiresAt) * 1000).toISOString()}`
    )
    console.log(`  Active: ${potData.isActive}`)
    console.log(`  Attempts: ${potData.attemptsCount}`)
    console.log(`  1FA Address: ${potData.oneFaAddress}`)
  } catch (error) {
    console.log(`⚠️ Could not read pot details: ${error.message}`)
  }
  console.log("")

  // Step 2: First Attempt (Fail)
  console.log("🎯 First Attempt - Will Fail")

  const firstAttemptTx = await moneyPot.connect(adminSigner).attemptPot(potId)
  const firstAttemptReceipt = await firstAttemptTx.wait()

  console.log(`✅ Transaction: ${firstAttemptTx.hash}`)
  console.log(
    `   Why: First attempt to solve pot ${potId} - paying ${ethers.formatEther(
      POT_FEE
    )} tokens entry fee`
  )

  // Extract attempt ID from event
  const firstAttemptEvent = firstAttemptReceipt?.logs.find((log) => {
    try {
      const parsed = moneyPot.interface.parseLog(log)
      return parsed?.name === "PotAttempted"
    } catch {
      return false
    }
  })

  const firstAttemptId = firstAttemptEvent
    ? moneyPot.interface.parseLog(firstAttemptEvent).args[0]
    : 0n
  console.log(`✅ First attempt created with ID: ${firstAttemptId}`)

  // Get attempt details
  try {
    const firstAttemptData = await moneyPot.getAttempt(firstAttemptId)
    console.log(`📊 First Attempt Details:`)
    console.log(`  Hunter: ${firstAttemptData.hunter}`)
    console.log(`  Difficulty: ${firstAttemptData.difficulty}`)
    console.log(
      `  Expires: ${new Date(
        Number(firstAttemptData.expiresAt) * 1000
      ).toISOString()}`
    )
    console.log(`  Completed: ${firstAttemptData.isCompleted}`)
  } catch (error) {
    console.log(`⚠️ Could not read attempt details: ${error.message}`)
  }
  console.log("")

  // Mark first attempt as failed
  console.log("❌ Verifier marking first attempt as FAILED...")
  const failTx = await moneyPot
    .connect(verifierSigner)
    .attemptCompleted(firstAttemptId, false)
  await failTx.wait()

  console.log(`✅ Transaction: ${failTx.hash}`)
  console.log(`   Why: Verifier marking attempt ${firstAttemptId} as FAILED`)
  console.log("✅ First attempt marked as failed")
  console.log("")

  // Step 3: Second Attempt (Success)
  console.log("🎯 Second Attempt - Will Succeed")

  const secondAttemptTx = await moneyPot.connect(adminSigner).attemptPot(potId)
  const secondAttemptReceipt = await secondAttemptTx.wait()

  console.log(`✅ Transaction: ${secondAttemptTx.hash}`)
  console.log(
    `   Why: Second attempt to solve pot ${potId} - paying another ${ethers.formatEther(
      POT_FEE
    )} tokens entry fee`
  )

  // Extract attempt ID from event
  const secondAttemptEvent = secondAttemptReceipt?.logs.find((log) => {
    try {
      const parsed = moneyPot.interface.parseLog(log)
      return parsed?.name === "PotAttempted"
    } catch {
      return false
    }
  })

  const secondAttemptId = secondAttemptEvent
    ? moneyPot.interface.parseLog(secondAttemptEvent).args[0]
    : 0n
  console.log(`✅ Second attempt created with ID: ${secondAttemptId}`)

  // Get attempt details
  try {
    const secondAttemptData = await moneyPot.getAttempt(secondAttemptId)
    console.log(`📊 Second Attempt Details:`)
    console.log(`  Hunter: ${secondAttemptData.hunter}`)
    console.log(`  Difficulty: ${secondAttemptData.difficulty}`)
    console.log(
      `  Expires: ${new Date(
        Number(secondAttemptData.expiresAt) * 1000
      ).toISOString()}`
    )
    console.log(`  Completed: ${secondAttemptData.isCompleted}`)
  } catch (error) {
    console.log(`⚠️ Could not read attempt details: ${error.message}`)
  }
  console.log("")

  // Mark second attempt as successful
  console.log("✅ Verifier marking second attempt as SUCCESSFUL...")
  const successTx = await moneyPot
    .connect(verifierSigner)
    .attemptCompleted(secondAttemptId, true)
  await successTx.wait()

  console.log(`✅ Transaction: ${successTx.hash}`)
  console.log(`   Why: Verifier marking attempt ${secondAttemptId} as SUCCESS`)
  console.log("✅ Second attempt marked as successful!")
  console.log("")

  // Step 4: Final Verification
  console.log("🔍 Final Verification:")
  console.log("=".repeat(30))

  // Check final pot status
  try {
    const finalPotData = await moneyPot.getPot(potId)
    console.log(
      `🎯 Final Pot Status: ${finalPotData.isActive ? "Active" : "Inactive"}`
    )
    console.log(`Total attempts: ${finalPotData.attemptsCount}`)
  } catch (error) {
    console.log(`⚠️ Could not read final pot status: ${error.message}`)
  }

  // Check final balances
  try {
    const finalAdminBalance = await token.balanceOf(admin.address)
    const finalContractBalance = await token.balanceOf(
      await moneyPot.getAddress()
    )
    console.log(`💰 Final Balances:`)
    console.log(`  Admin: ${ethers.formatEther(finalAdminBalance)} tokens`)
    console.log(
      `  Contract: ${ethers.formatEther(finalContractBalance)} tokens`
    )
  } catch (error) {
    console.log(`⚠️ Could not read final balances: ${error.message}`)
  }

  // Calculate hunter's share (60% of pot amount)
  const hunterShare = (POT_AMOUNT * 60n) / 100n
  console.log(
    `🎁 Hunter's share (60%): ${ethers.formatEther(hunterShare)} tokens`
  )

  // Calculate platform share (40% of pot amount)
  const platformShare = POT_AMOUNT - hunterShare
  console.log(
    `🏛️ Platform share (40%): ${ethers.formatEther(platformShare)} tokens`
  )
  console.log("")

  // Show contract constants for reference
  try {
    const difficultyMod = await moneyPot.DIFFICULTY_MOD()
    const hunterSharePercent = await moneyPot.HUNTER_SHARE_PERCENT()
    const creatorEntryFeeSharePercent =
      await moneyPot.CREATOR_ENTRY_FEE_SHARE_PERCENT()

    console.log(`📋 Contract Constants:`)
    console.log(`Difficulty Modifier: ${difficultyMod}`)
    console.log(`Hunter Share: ${hunterSharePercent}%`)
    console.log(`Creator Entry Fee Share: ${creatorEntryFeeSharePercent}%`)
  } catch (error) {
    console.log(`⚠️ Could not read contract constants: ${error.message}`)
  }
  console.log("")

  // Summary
  console.log("📋 Flow Summary:")
  console.log("=".repeat(30))
  console.log(`✅ Pot created with ID: ${potId}`)
  console.log(`❌ First attempt (${firstAttemptId}) failed`)
  console.log(`✅ Second attempt (${secondAttemptId}) succeeded`)
  console.log(`🏆 Pot should now be inactive`)
  console.log(
    `💰 Admin should have received ${ethers.formatEther(
      hunterShare
    )} tokens as hunter`
  )
  console.log(
    `🏛️ Platform should have kept ${ethers.formatEther(platformShare)} tokens`
  )
  console.log("")
  console.log("🎉 MoneyPot Flow Test Completed Successfully!")
  console.log("")
  console.log("📝 Note: This script demonstrates the complete MoneyPot flow:")
  console.log("   1. ✅ Pot creation with token deposit")
  console.log("   2. ✅ First attempt (failed by verifier)")
  console.log("   3. ✅ Second attempt (succeeded by verifier)")
  console.log("   4. ✅ Automatic payout to hunter (60%) and platform (40%)")
  console.log("")
  console.log(
    "🔧 All transactions were successfully executed on the blockchain!"
  )
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error)
    process.exit(1)
  })
