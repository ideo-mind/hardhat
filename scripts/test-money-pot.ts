import { HardhatRuntimeEnvironment } from "hardhat/types"
import { parseEther } from "viem"
import {
  loadDeploymentInfo,
  getAccounts,
  logAccountBalances,
} from "./deploy-helpers"

/**
 * Test MoneyPot functionality after deployment
 *
 * This script:
 * 1. Loads deployed contract addresses
 * 2. Tests basic MoneyPot functionality
 * 3. Creates a test pot
 * 4. Attempts the pot
 * 5. Verifies the game mechanics work
 */
async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🧪 Testing MoneyPot functionality...")
  console.log(`Network: ${hre.network.name}`)

  // Get accounts
  const { deployer, owner, user1, user2, user3, feeRecipient } =
    await getAccounts(hre)

  // Load deployment information
  const moneyPotInfo = await loadDeploymentInfo(hre.network.name, "MoneyPot")
  const mockTokenInfo = await loadDeploymentInfo(hre.network.name, "MockERC20")

  if (!moneyPotInfo) {
    console.error(
      "❌ MoneyPot not deployed. Please run deployment script first."
    )
    return
  }

  console.log(`✅ Found MoneyPot at: ${moneyPotInfo.address}`)

  // Get contract instances
  const moneyPot = await hre.ethers.getContractAt(
    "MoneyPot",
    moneyPotInfo.address
  )

  let tokenContract
  let tokenSymbol = "pyUSD"
  let tokenDecimals = 6

  if (mockTokenInfo) {
    console.log(`✅ Found MockERC20 at: ${mockTokenInfo.address}`)
    tokenContract = await hre.ethers.getContractAt(
      "MockERC20",
      mockTokenInfo.address
    )
    tokenSymbol = "MUSDC"
  } else {
    // Try to get pyUSD from network config
    const networkConfig = hre.config.networks[hre.network.name] as any
    const pyUSDAddress = networkConfig?.tokens?.pyUSD?.address

    if (pyUSDAddress) {
      console.log(`✅ Using pyUSD at: ${pyUSDAddress}`)
      tokenContract = await hre.ethers.getContractAt(
        "IERC20Metadata",
        pyUSDAddress
      )
    } else {
      console.error(
        "❌ No token contract found. Please deploy MockERC20 or configure pyUSD."
      )
      return
    }
  }

  // Log initial balances
  console.log("\n💰 Initial Account Balances:")
  await logAccountBalances(hre)

  // Test 1: Check contract initialization
  console.log("\n🧪 Test 1: Contract Initialization")
  try {
    const underlyingToken = await moneyPot.underlying()
    const trustedOracle = await moneyPot.trustedOracle()
    const owner = await moneyPot.owner()

    console.log(`✅ Underlying token: ${underlyingToken}`)
    console.log(`✅ Trusted oracle: ${trustedOracle}`)
    console.log(`✅ Owner: ${owner}`)
  } catch (error) {
    console.error("❌ Contract initialization test failed:", error)
    return
  }

  // Test 2: Check token balances
  console.log("\n🧪 Test 2: Token Balances")
  try {
    const deployerBalance = await tokenContract.balanceOf(
      deployer.account.address
    )
    const user1Balance = await tokenContract.balanceOf(user1.account.address)

    console.log(
      `✅ Deployer ${tokenSymbol} balance: ${hre.ethers.formatUnits(deployerBalance, tokenDecimals)}`
    )
    console.log(
      `✅ User1 ${tokenSymbol} balance: ${hre.ethers.formatUnits(user1Balance, tokenDecimals)}`
    )

    // If using MockERC20 and deployer has no balance, mint some tokens
    if (mockTokenInfo && deployerBalance === 0n) {
      console.log("🔄 Minting tokens for deployer...")
      const mintTx = await tokenContract.mint(
        deployer.account.address,
        parseEther("10000")
      )
      await mintTx.wait()
      console.log("✅ Minted 10,000 tokens for deployer")
    }
  } catch (error) {
    console.error("❌ Token balance test failed:", error)
    return
  }

  // Test 3: Create a test pot
  console.log("\n🧪 Test 3: Creating Test Pot")
  try {
    const potAmount = parseEther("100") // 100 tokens
    const potFee = parseEther("1") // 1 token fee
    const durationSeconds = 3600 // 1 hour
    const oneFaAddress = user2.account.address // Use user2 as 1FA address

    // Approve MoneyPot to spend tokens
    const approveTx = await tokenContract.approve(
      moneyPotInfo.address,
      potAmount
    )
    await approveTx.wait()
    console.log("✅ Approved MoneyPot to spend tokens")

    // Create the pot
    const createTx = await moneyPot.createPot(
      potAmount,
      durationSeconds,
      potFee,
      oneFaAddress
    )
    const createReceipt = await createTx.wait()
    console.log("✅ Test pot created successfully")

    // Get pot ID from event
    const potCreatedEvent = createReceipt.logs.find((log) => {
      try {
        const parsed = moneyPot.interface.parseLog(log)
        return parsed?.name === "PotCreated"
      } catch {
        return false
      }
    })

    if (potCreatedEvent) {
      const parsed = moneyPot.interface.parseLog(potCreatedEvent)
      const potId = parsed?.args.id
      console.log(`✅ Pot ID: ${potId}`)

      // Test 4: Get pot information
      console.log("\n🧪 Test 4: Pot Information")
      const potData = await moneyPot.getPot(potId)
      console.log(`✅ Pot ID: ${potData.id}`)
      console.log(`✅ Creator: ${potData.creator}`)
      console.log(
        `✅ Total Amount: ${hre.ethers.formatUnits(potData.totalAmount, tokenDecimals)} ${tokenSymbol}`
      )
      console.log(
        `✅ Fee: ${hre.ethers.formatUnits(potData.fee, tokenDecimals)} ${tokenSymbol}`
      )
      console.log(
        `✅ Created At: ${new Date(Number(potData.createdAt) * 1000).toISOString()}`
      )
      console.log(
        `✅ Expires At: ${new Date(Number(potData.expiresAt) * 1000).toISOString()}`
      )
      console.log(`✅ Is Active: ${potData.isActive}`)
      console.log(`✅ Attempts Count: ${potData.attemptsCount}`)
      console.log(`✅ 1FA Address: ${potData.oneFaAddress}`)

      // Test 5: Attempt the pot
      console.log("\n🧪 Test 5: Attempting Pot")
      try {
        // User1 attempts the pot
        const user1TokenContract = tokenContract.connect(user1)
        const user1MoneyPot = moneyPot.connect(user1)

        // Approve fee payment
        const user1ApproveTx = await user1TokenContract.approve(
          moneyPotInfo.address,
          potFee
        )
        await user1ApproveTx.wait()
        console.log("✅ User1 approved fee payment")

        // Attempt the pot
        const attemptTx = await user1MoneyPot.attemptPot(potId)
        const attemptReceipt = await attemptTx.wait()
        console.log("✅ Pot attempt successful")

        // Get attempt ID from event
        const potAttemptedEvent = attemptReceipt.logs.find((log) => {
          try {
            const parsed = moneyPot.interface.parseLog(log)
            return parsed?.name === "PotAttempted"
          } catch {
            return false
          }
        })

        if (potAttemptedEvent) {
          const parsed = moneyPot.interface.parseLog(potAttemptedEvent)
          const attemptId = parsed?.args.attemptId
          console.log(`✅ Attempt ID: ${attemptId}`)

          // Get attempt information
          const attemptData = await moneyPot.getAttempt(attemptId)
          console.log(`✅ Attempt ID: ${attemptData.id}`)
          console.log(`✅ Pot ID: ${attemptData.potId}`)
          console.log(`✅ Hunter: ${attemptData.hunter}`)
          console.log(
            `✅ Expires At: ${new Date(Number(attemptData.expiresAt) * 1000).toISOString()}`
          )
          console.log(`✅ Difficulty: ${attemptData.difficulty}`)
          console.log(`✅ Is Completed: ${attemptData.isCompleted}`)
        }
      } catch (error) {
        console.error("❌ Pot attempt test failed:", error)
      }
    }
  } catch (error) {
    console.error("❌ Create pot test failed:", error)
    return
  }

  // Test 6: Get active pots
  console.log("\n🧪 Test 6: Active Pots")
  try {
    const activePots = await moneyPot.getActivePots()
    console.log(`✅ Active pots count: ${activePots.length}`)

    const allPots = await moneyPot.getPots()
    console.log(`✅ Total pots count: ${allPots.length}`)
  } catch (error) {
    console.error("❌ Active pots test failed:", error)
  }

  // Log final balances
  console.log("\n💰 Final Account Balances:")
  await logAccountBalances(hre)

  console.log("\n🎉 All tests completed!")
}

// Export the main function for Hardhat
export default main

// Run if called directly
if (require.main === module) {
  main(require("hardhat")).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
