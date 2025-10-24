import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers"
import { expect } from "chai"
import hre from "hardhat"
import { parseEther } from "viem"

describe("MoneyPot Deployment", function () {
  async function deployMoneyPotFixture() {
    // Get wallet clients (signers)
    const [deployer, oracle] = await hre.viem.getWalletClients()

    // Deploy MockERC20 token
    const mockToken = await hre.viem.deployContract("MockERC20", [
      "Mock USDC",
      "MUSDC",
      6, // decimals
      parseEther("1000000"), // 1M tokens
    ])

    // Deploy MoneyPot
    const moneyPot = await hre.viem.deployContract("MoneyPot", [])

    // Initialize MoneyPot
    await moneyPot.write.initialize([mockToken.address, oracle.account.address])

    return {
      moneyPot,
      mockToken,
      deployer,
      oracle,
    }
  }

  it("Should deploy and initialize MoneyPot successfully", async function () {
    const { moneyPot, mockToken, deployer, oracle } = await loadFixture(
      deployMoneyPotFixture
    )

    console.log(`✅ MockERC20 deployed to: ${mockToken.address}`)
    console.log(`✅ MoneyPot deployed to: ${moneyPot.address}`)
    console.log(`🔮 Oracle: ${oracle.account.address}`)
    console.log(`👤 Deployer: ${deployer.account.address}`)

    // Verify initialization
    const trustedOracle = await moneyPot.read.trustedOracle()
    expect(trustedOracle).to.equal(oracle.account.address)

    // Verify token is set
    const underlyingToken = await moneyPot.read.underlying()
    expect(underlyingToken).to.equal(mockToken.address)

    console.log("🎉 Deployment test passed!")
  })
})
