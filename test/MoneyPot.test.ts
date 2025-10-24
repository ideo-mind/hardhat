import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("MoneyPot", function () {
  // Test fixtures for deployment
  async function deployMoneyPotFixture() {
    // Get wallet clients (signers)
    const [deployer, user1, user2, user3, feeRecipient] = await hre.viem.getWalletClients();

    // Deployment parameters
    const minimumDeposit = parseEther("0.01"); // 0.01 ETH
    const maximumDeposit = parseEther("10"); // 10 ETH
    const feePercentage = 100n; // 1% (100 basis points)

    // Deploy the contract
    const moneyPot = await hre.viem.deployContract("MoneyPot", [
      minimumDeposit,
      maximumDeposit,
      feePercentage,
      feeRecipient.account.address,
    ]);

    // Get public client for reading
    const publicClient = await hre.viem.getPublicClient();

    return {
      moneyPot,
      deployer,
      user1,
      user2,
      user3,
      feeRecipient,
      publicClient,
      minimumDeposit,
      maximumDeposit,
      feePercentage,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      const owner = await moneyPot.read.owner();
      expect(getAddress(owner)).to.equal(getAddress(deployer.account.address));
    });

    it("Should set the correct minimum deposit", async function () {
      const { moneyPot, minimumDeposit } = await loadFixture(deployMoneyPotFixture);

      const minDeposit = await moneyPot.read.minimumDeposit();
      expect(minDeposit).to.equal(minimumDeposit);
    });

    it("Should set the correct maximum deposit", async function () {
      const { moneyPot, maximumDeposit } = await loadFixture(deployMoneyPotFixture);

      const maxDeposit = await moneyPot.read.maximumDeposit();
      expect(maxDeposit).to.equal(maximumDeposit);
    });

    it("Should set the correct fee percentage", async function () {
      const { moneyPot, feePercentage } = await loadFixture(deployMoneyPotFixture);

      const fee = await moneyPot.read.feePercentage();
      expect(fee).to.equal(feePercentage);
    });

    it("Should set the correct fee recipient", async function () {
      const { moneyPot, feeRecipient } = await loadFixture(deployMoneyPotFixture);

      const recipient = await moneyPot.read.feeRecipient();
      expect(getAddress(recipient)).to.equal(getAddress(feeRecipient.account.address));
    });

    it("Should start with zero total deposits", async function () {
      const { moneyPot } = await loadFixture(deployMoneyPotFixture);

      const totalDeposits = await moneyPot.read.totalDeposits();
      expect(totalDeposits).to.equal(0n);
    });

    it("Should start with zero participants", async function () {
      const { moneyPot } = await loadFixture(deployMoneyPotFixture);

      const totalParticipants = await moneyPot.read.totalParticipants();
      expect(totalParticipants).to.equal(0n);
    });
  });

  describe("Deposits", function () {
    it("Should accept valid deposits", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      const depositAmount = parseEther("1");

      await moneyPot.write.deposit({
        value: depositAmount,
        account: user1.account,
      });

      const balance = await moneyPot.read.balances([user1.account.address]);
      const expectedBalance = (depositAmount * 99n) / 100n; // 1% fee deducted

      expect(balance).to.be.closeTo(expectedBalance, parseEther("0.001"));
    });

    it("Should increment participant count on first deposit", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      const initialCount = await moneyPot.read.totalParticipants();

      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const finalCount = await moneyPot.read.totalParticipants();
      expect(finalCount).to.equal(initialCount + 1n);
    });

    it("Should not increment participant count on subsequent deposits", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const countAfterFirst = await moneyPot.read.totalParticipants();

      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const countAfterSecond = await moneyPot.read.totalParticipants();
      expect(countAfterSecond).to.equal(countAfterFirst);
    });

    it("Should collect fees correctly", async function () {
      const { moneyPot, user1, feeRecipient, publicClient } = await loadFixture(deployMoneyPotFixture);

      const initialBalance = await publicClient.getBalance({
        address: feeRecipient.account.address,
      });

      const depositAmount = parseEther("1");
      const expectedFee = depositAmount / 100n; // 1% fee

      await moneyPot.write.deposit({
        value: depositAmount,
        account: user1.account,
      });

      const finalBalance = await publicClient.getBalance({
        address: feeRecipient.account.address,
      });

      expect(finalBalance - initialBalance).to.equal(expectedFee);
    });

    it("Should reject deposits below minimum", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      const belowMinimum = parseEther("0.005"); // Below 0.01 ETH minimum

      await expect(
        moneyPot.write.deposit({
          value: belowMinimum,
          account: user1.account,
        })
      ).to.be.rejectedWith("Deposit below minimum");
    });

    it("Should reject deposits above maximum", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      const aboveMaximum = parseEther("11"); // Above 10 ETH maximum

      await expect(
        moneyPot.write.deposit({
          value: aboveMaximum,
          account: user1.account,
        })
      ).to.be.rejectedWith("Deposit exceeds maximum");
    });

    it("Should emit Deposited event", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      const depositAmount = parseEther("1");
      const netDeposit = (depositAmount * 99n) / 100n; // After 1% fee

      const hash = await moneyPot.write.deposit({
        value: depositAmount,
        account: user1.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = await moneyPot.getEvents.Deposited({}, { fromBlock: receipt.blockNumber });

      expect(logs.length).to.equal(1);
      expect(logs[0].args.user?.toLowerCase()).to.equal(user1.account.address.toLowerCase());
      expect(logs[0].args.amount).to.be.closeTo(netDeposit, parseEther("0.001"));
    });
  });

  describe("Withdrawals", function () {
    it("Should allow users to withdraw their balance", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      // First deposit
      const depositAmount = parseEther("1");
      await moneyPot.write.deposit({
        value: depositAmount,
        account: user1.account,
      });

      const balanceBefore = await moneyPot.read.balances([user1.account.address]);

      // Withdraw half
      const withdrawAmount = balanceBefore / 2n;
      await moneyPot.write.withdraw([withdrawAmount], {
        account: user1.account,
      });

      const balanceAfter = await moneyPot.read.balances([user1.account.address]);
      expect(balanceAfter).to.equal(balanceBefore - withdrawAmount);
    });

    it("Should allow users to withdraw all funds", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      // Deposit
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      // Withdraw all
      await moneyPot.write.withdrawAll({
        account: user1.account,
      });

      const balance = await moneyPot.read.balances([user1.account.address]);
      expect(balance).to.equal(0n);
    });

    it("Should decrement participant count when withdrawing all", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      // Deposit
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const countBefore = await moneyPot.read.totalParticipants();

      // Withdraw all
      await moneyPot.write.withdrawAll({
        account: user1.account,
      });

      const countAfter = await moneyPot.read.totalParticipants();
      expect(countAfter).to.equal(countBefore - 1n);
    });

    it("Should reject withdrawal of more than balance", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      // Deposit
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const balance = await moneyPot.read.balances([user1.account.address]);

      await expect(
        moneyPot.write.withdraw([balance + parseEther("1")], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Insufficient balance");
    });

    it("Should emit Withdrawn event", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      // Deposit first
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const withdrawAmount = parseEther("0.5");

      const hash = await moneyPot.write.withdraw([withdrawAmount], {
        account: user1.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = await moneyPot.getEvents.Withdrawn({}, { fromBlock: receipt.blockNumber });

      expect(logs.length).to.equal(1);
      expect(logs[0].args.user?.toLowerCase()).to.equal(user1.account.address.toLowerCase());
      expect(logs[0].args.amount).to.be.closeTo(withdrawAmount, parseEther("0.001"));
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow emergency withdrawal even when paused", async function () {
      const { moneyPot, user1, deployer } = await loadFixture(deployMoneyPotFixture);

      // Deposit
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      // Pause the contract
      await moneyPot.write.pause({
        account: deployer.account,
      });

      // Emergency withdraw should still work
      await moneyPot.write.emergencyWithdraw({
        account: user1.account,
      });

      const balance = await moneyPot.read.balances([user1.account.address]);
      expect(balance).to.equal(0n);
    });

    it("Should emit EmergencyWithdraw event", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      // Deposit
      const depositAmount = parseEther("1");
      await moneyPot.write.deposit({
        value: depositAmount,
        account: user1.account,
      });

      const balance = await moneyPot.read.balances([user1.account.address]);

      const hash = await moneyPot.write.emergencyWithdraw({
        account: user1.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = await moneyPot.getEvents.EmergencyWithdraw({}, { fromBlock: receipt.blockNumber });

      expect(logs.length).to.equal(1);
      expect(logs[0].args.user?.toLowerCase()).to.equal(user1.account.address.toLowerCase());
      expect(logs[0].args.amount).to.equal(balance);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update minimum deposit", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      const newMinimum = parseEther("0.02");

      await moneyPot.write.setMinimumDeposit([newMinimum], {
        account: deployer.account,
      });

      const minimum = await moneyPot.read.minimumDeposit();
      expect(minimum).to.equal(newMinimum);
    });

    it("Should allow owner to update maximum deposit", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      const newMaximum = parseEther("20");

      await moneyPot.write.setMaximumDeposit([newMaximum], {
        account: deployer.account,
      });

      const maximum = await moneyPot.read.maximumDeposit();
      expect(maximum).to.equal(newMaximum);
    });

    it("Should allow owner to update fee percentage", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      const newFee = 250n; // 2.5%

      await moneyPot.write.setFeePercentage([newFee], {
        account: deployer.account,
      });

      const fee = await moneyPot.read.feePercentage();
      expect(fee).to.equal(newFee);
    });

    it("Should allow owner to update fee recipient", async function () {
      const { moneyPot, deployer, user3 } = await loadFixture(deployMoneyPotFixture);

      await moneyPot.write.setFeeRecipient([user3.account.address], {
        account: deployer.account,
      });

      const recipient = await moneyPot.read.feeRecipient();
      expect(getAddress(recipient)).to.equal(getAddress(user3.account.address));
    });

    it("Should reject non-owner admin calls", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      await expect(
        moneyPot.write.setMinimumDeposit([parseEther("0.02")], {
          account: user1.account,
        })
      ).to.be.rejected;
    });

    it("Should reject fee percentage above 10%", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      await expect(
        moneyPot.write.setFeePercentage([1001n], { // 10.01%
          account: deployer.account,
        })
      ).to.be.rejectedWith("Fee cannot exceed 10%");
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      await moneyPot.write.pause({
        account: deployer.account,
      });

      const paused = await moneyPot.read.paused();
      expect(paused).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      const { moneyPot, deployer } = await loadFixture(deployMoneyPotFixture);

      await moneyPot.write.pause({
        account: deployer.account,
      });

      await moneyPot.write.unpause({
        account: deployer.account,
      });

      const paused = await moneyPot.read.paused();
      expect(paused).to.be.false;
    });

    it("Should reject deposits when paused", async function () {
      const { moneyPot, deployer, user1 } = await loadFixture(deployMoneyPotFixture);

      await moneyPot.write.pause({
        account: deployer.account,
      });

      await expect(
        moneyPot.write.deposit({
          value: parseEther("1"),
          account: user1.account,
        })
      ).to.be.rejectedWith("Pausable: paused");
    });

    it("Should reject withdrawals when paused", async function () {
      const { moneyPot, deployer, user1 } = await loadFixture(deployMoneyPotFixture);

      // Deposit first
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      // Pause
      await moneyPot.write.pause({
        account: deployer.account,
      });

      await expect(
        moneyPot.write.withdraw([parseEther("0.5")], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Pausable: paused");
    });
  });

  describe("View Functions", function () {
    it("Should return correct balance for user", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      const depositAmount = parseEther("1");
      await moneyPot.write.deposit({
        value: depositAmount,
        account: user1.account,
      });

      const balance = await moneyPot.read.getBalance([user1.account.address]);
      const directBalance = await moneyPot.read.balances([user1.account.address]);

      expect(balance).to.equal(directBalance);
    });

    it("Should return correct pot statistics", async function () {
      const { moneyPot, user1, user2, publicClient } = await loadFixture(deployMoneyPotFixture);

      // Multiple deposits
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      await moneyPot.write.deposit({
        value: parseEther("2"),
        account: user2.account,
      });

      const stats = await moneyPot.read.getPotStats();

      expect(stats[1]).to.equal(2n); // 2 participants
      expect(stats[0]).to.be.gt(0n); // Total deposits > 0
      expect(stats[2]).to.be.gt(0n); // Fees collected > 0
    });
  });

  describe("Fallback Functions", function () {
    it("Should reject direct ETH transfers via receive", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      await expect(
        user1.sendTransaction({
          to: moneyPot.address,
          value: parseEther("1"),
        })
      ).to.be.rejectedWith("Direct transfers not allowed");
    });

    it("Should reject direct ETH transfers via fallback", async function () {
      const { moneyPot, user1 } = await loadFixture(deployMoneyPotFixture);

      await expect(
        user1.sendTransaction({
          to: moneyPot.address,
          value: parseEther("1"),
          data: "0x12345678" as `0x${string}`, // Random data to trigger fallback
        })
      ).to.be.rejectedWith("Direct transfers not allowed");
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for deposits", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      const hash = await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Gas should be reasonable (less than 100k for a deposit)
      expect(receipt.gasUsed).to.be.lt(100000n);
    });

    it("Should have reasonable gas costs for withdrawals", async function () {
      const { moneyPot, user1, publicClient } = await loadFixture(deployMoneyPotFixture);

      // Setup: deposit first
      await moneyPot.write.deposit({
        value: parseEther("1"),
        account: user1.account,
      });

      const hash = await moneyPot.write.withdraw([parseEther("0.5")], {
        account: user1.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Gas should be reasonable (less than 100k for a withdrawal)
      expect(receipt.gasUsed).to.be.lt(100000n);
    });
  });
});
