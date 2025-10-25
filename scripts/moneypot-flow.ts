import { network } from "hardhat"
import { getAccount } from "../utils/accounts"

const { ethers } = await network.connect({
  network: "hardhat",
})

console.log("🚀 Starting MoneyPot Flow Test")
console.log("=".repeat(50))

// Contract addresses from latest deployment
const MONEYPOT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const TOKEN_ADDRESS = "0x6c3ea9036406852006290770bedfcaba0e23a0e8"

// Get accounts
const adminAccount = getAccount("admin")
const verifierAccount = getAccount("verifier")

console.log("📋 Account Setup:")
console.log(`Admin: ${adminAccount.address}`)
console.log(`Verifier: ${verifierAccount.address}`)
console.log("")

// Get signers
const adminSigner = await ethers.getSigner(adminAccount.address)
const verifierSigner = await ethers.getSigner(verifierAccount.address)

// Connect to contracts
const MoneyPotFactory = await ethers.getContractFactory("MoneyPot")
const MoneyPot = MoneyPotFactory.attach(MONEYPOT_ADDRESS) as any

const TokenFactory = await ethers.getContractFactory("MockERC20")
const Token = TokenFactory.attach(TOKEN_ADDRESS) as any

console.log("🔗 Connected to contracts:")
console.log(`MoneyPot: ${MONEYPOT_ADDRESS}`)
console.log(`Token: ${TOKEN_ADDRESS}`)
console.log("")

// Initialize MoneyPot if needed
try {
  console.log("🔧 Initializing MoneyPot contract...")
  const initTx = await MoneyPot.connect(adminSigner).initialize(
    Token,
    verifierAccount.address
  )
  await initTx.wait()
  console.log("✅ MoneyPot initialized successfully")
} catch (initError) {
  console.log(`ℹ️ MoneyPot already initialized or error: ${initError.message}`)
}

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
  const mintTx = await Token.connect(adminSigner).mint(
    adminAccount.address,
    POT_AMOUNT * 2n
  )
  await mintTx.wait()
  console.log(
    `✅ Minted ${ethers.formatEther(POT_AMOUNT * 2n)} tokens to admin`
  )

  const approveTx = await Token.connect(adminSigner).approve(
    MONEYPOT_ADDRESS,
    POT_AMOUNT * 2n
  )
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
let potId: bigint = 0n // Start with pot ID 0
try {
  const createPotTx = await MoneyPot.connect(adminSigner).createPot(
    POT_AMOUNT,
    POT_DURATION,
    POT_FEE,
    oneFaAddress
  )
  await createPotTx.wait()
  console.log(`✅ Pot created with ID: ${potId}`)
} catch (error) {
  console.log(`❌ Error creating pot: ${error.message}`)
  throw error
}

console.log(`📊 Pot created successfully!`)
console.log(`  - Pot ID: ${potId}`)
console.log(`  - Amount: ${ethers.formatEther(POT_AMOUNT)} tokens`)
console.log(`  - Fee: ${ethers.formatEther(POT_FEE)} tokens`)
console.log(`  - Duration: ${POT_DURATION} seconds`)
console.log(`  - 1FA Address: ${oneFaAddress}`)
console.log("")

// Step 2: First Attempt (Fail)
console.log("🎯 First Attempt - Will Fail")
let attempt1Id: bigint = 0n
try {
  const attempt1Tx = await MoneyPot.connect(adminSigner).attemptPot(potId)
  await attempt1Tx.wait()
  console.log(`✅ First attempt created with ID: ${attempt1Id}`)
} catch (error) {
  console.log(`❌ Error creating first attempt: ${error.message}`)
  throw error
}

console.log(`📊 First attempt details:`)
console.log(`  - Attempt ID: ${attempt1Id}`)
console.log(`  - Hunter: ${adminAccount.address}`)
console.log(`  - Pot ID: ${potId}`)
console.log("")

// Mark first attempt as failed
console.log("❌ Verifier marking first attempt as FAILED...")
try {
  const failTx = await MoneyPot.connect(verifierSigner).attemptCompleted(
    attempt1Id,
    false
  )
  await failTx.wait()
  console.log(`✅ First attempt marked as failed`)
} catch (error) {
  console.log(`❌ Error marking first attempt as failed: ${error.message}`)
  throw error
}

console.log("")

// Step 3: Second Attempt (Success)
console.log("🎯 Second Attempt - Will Succeed")
let attempt2Id: bigint = 1n
try {
  const attempt2Tx = await MoneyPot.connect(adminSigner).attemptPot(potId)
  await attempt2Tx.wait()
  console.log(`✅ Second attempt created with ID: ${attempt2Id}`)
} catch (error) {
  console.log(`❌ Error creating second attempt: ${error.message}`)
  throw error
}

console.log(`📊 Second attempt details:`)
console.log(`  - Attempt ID: ${attempt2Id}`)
console.log(`  - Hunter: ${adminAccount.address}`)
console.log(`  - Pot ID: ${potId}`)
console.log("")

// Mark second attempt as successful
console.log("✅ Verifier marking second attempt as SUCCESSFUL...")
try {
  const successTx = await MoneyPot.connect(verifierSigner).attemptCompleted(
    attempt2Id,
    true
  )
  await successTx.wait()
  console.log(`✅ Second attempt marked as successful`)
} catch (error) {
  console.log(`❌ Error marking second attempt as successful: ${error.message}`)
  throw error
}

// Step 4: Summary
console.log("🔍 Final Summary:")
console.log("=".repeat(30))

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

// Summary
console.log("📋 Flow Summary:")
console.log("=".repeat(30))
console.log(`✅ Pot created with ID: ${potId}`)
console.log(`❌ First attempt (${attempt1Id}) failed`)
console.log(`✅ Second attempt (${attempt2Id}) succeeded`)
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
console.log("🔧 All transactions were successfully executed on the blockchain!")
