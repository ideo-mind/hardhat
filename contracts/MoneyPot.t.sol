// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {MoneyPot} from "./MoneyPot.sol";
import {MockERC20} from "./MockERC20.sol";
import {Test} from "forge-std/Test.sol";

contract MoneyPotTest is Test {
    MoneyPot moneyPot;
    MockERC20 mockToken;

    address owner;
    address creator;
    address hunter;
    address verifier;

    uint256 constant INITIAL_SUPPLY = 1000000 * 10 ** 18; // 1M tokens
    uint256 constant POT_AMOUNT = 1000 * 10 ** 18; // 1000 tokens
    uint256 constant POT_FEE = 100 * 10 ** 18; // 100 tokens
    uint256 constant POT_DURATION = 86400; // 1 day in seconds
    address constant ONE_FA_ADDRESS =
        0x1234567890123456789012345678901234567890;

    function setUp() public {
        // Create test accounts
        owner = makeAddr("owner");
        creator = makeAddr("creator");
        hunter = makeAddr("hunter");
        verifier = makeAddr("verifier");

        // Deploy mock ERC20 token
        vm.prank(owner);
        mockToken = new MockERC20("Test Token", "TEST", 18, INITIAL_SUPPLY);

        // Deploy MoneyPot contract
        vm.prank(owner);
        moneyPot = new MoneyPot();

        // Initialize MoneyPot with mock token and verifier
        vm.prank(owner);
        moneyPot.initialize(mockToken, verifier);

        // Give creator some tokens and approve MoneyPot to spend them
        vm.prank(owner);
        mockToken.mint(creator, POT_AMOUNT * 2); // Give creator enough tokens

        vm.prank(creator);
        mockToken.approve(address(moneyPot), POT_AMOUNT * 2);

        // Give hunter some tokens for entry fees and approve MoneyPot
        vm.prank(owner);
        mockToken.mint(hunter, POT_FEE * 10); // Give hunter enough for multiple attempts

        vm.prank(hunter);
        mockToken.approve(address(moneyPot), POT_FEE * 10);
    }

    function test_CreatePot() public {
        // Verify event will be emitted
        vm.expectEmit(true, true, true, true);
        emit MoneyPot.PotCreated(0, creator, block.timestamp);

        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        // Verify pot was created correctly
        assertEq(potId, 0, "First pot should have ID 0");

        MoneyPot.MoneyPotData memory pot = moneyPot.getPot(potId);
        assertEq(pot.id, potId, "Pot ID should match");
        assertEq(pot.creator, creator, "Creator should match");
        assertEq(pot.totalAmount, POT_AMOUNT, "Total amount should match");
        assertEq(pot.fee, POT_FEE, "Fee should match");
        assertEq(pot.isActive, true, "Pot should be active");
        assertEq(pot.attemptsCount, 0, "Initial attempts count should be 0");
        assertEq(pot.oneFaAddress, ONE_FA_ADDRESS, "1FA address should match");

        // Verify creator's balance decreased
        assertEq(
            mockToken.balanceOf(creator),
            POT_AMOUNT,
            "Creator should have remaining tokens"
        );
        assertEq(
            mockToken.balanceOf(address(moneyPot)),
            POT_AMOUNT,
            "MoneyPot should hold the pot amount"
        );
    }

    function test_AttemptPot() public {
        // First create a pot
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        // Now attempt the pot with hunter
        vm.prank(hunter);
        uint256 attemptId = moneyPot.attemptPot(potId);

        // Verify attempt was created correctly
        assertEq(attemptId, 0, "First attempt should have ID 0");

        MoneyPot.Attempt memory attempt = moneyPot.getAttempt(attemptId);
        assertEq(attempt.id, attemptId, "Attempt ID should match");
        assertEq(attempt.potId, potId, "Pot ID should match");
        assertEq(attempt.hunter, hunter, "Hunter should match");
        assertEq(attempt.isCompleted, false, "Attempt should not be completed");
        assertEq(attempt.difficulty, 3, "First attempt difficulty should be 3");

        // Verify pot attempts count increased
        MoneyPot.MoneyPotData memory pot = moneyPot.getPot(potId);
        assertEq(pot.attemptsCount, 1, "Pot attempts count should be 1");

        // Verify fee distribution
        uint256 creatorShare = (POT_FEE * 50) / 100; // 50% to creator
        uint256 platformShare = POT_FEE - creatorShare; // Rest to platform

        assertEq(
            mockToken.balanceOf(creator),
            POT_AMOUNT + creatorShare,
            "Creator should receive entry fee share"
        );
        assertEq(
            mockToken.balanceOf(address(moneyPot)),
            POT_AMOUNT + platformShare,
            "MoneyPot should receive platform share"
        );

        // Verify hunter's balance decreased
        assertEq(
            mockToken.balanceOf(hunter),
            POT_FEE * 9,
            "Hunter should have paid the entry fee"
        );
    }

    function test_AttemptCompleted_Failed() public {
        // Create pot and attempt
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        vm.prank(hunter);
        uint256 attemptId = moneyPot.attemptPot(potId);

        // Mark attempt as failed by verifier
        vm.prank(verifier);
        moneyPot.attemptCompleted(attemptId, false);

        // Verify attempt is marked as completed
        MoneyPot.Attempt memory attempt = moneyPot.getAttempt(attemptId);
        assertEq(attempt.isCompleted, true, "Attempt should be completed");

        // Verify pot is still active (not solved)
        MoneyPot.MoneyPotData memory pot = moneyPot.getPot(potId);
        assertEq(pot.isActive, true, "Pot should still be active");

        // Verify hunter didn't receive any payout
        assertEq(
            mockToken.balanceOf(hunter),
            POT_FEE * 9,
            "Hunter should not receive payout"
        );
    }

    function test_AttemptCompleted_Success() public {
        // Create pot and attempt
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        vm.prank(hunter);
        uint256 attemptId = moneyPot.attemptPot(potId);

        // Mark attempt as successful by verifier
        vm.prank(verifier);
        moneyPot.attemptCompleted(attemptId, true);

        // Verify attempt is marked as completed
        MoneyPot.Attempt memory attempt = moneyPot.getAttempt(attemptId);
        assertEq(attempt.isCompleted, true, "Attempt should be completed");

        // Verify pot is no longer active (solved)
        MoneyPot.MoneyPotData memory pot = moneyPot.getPot(potId);
        assertEq(pot.isActive, false, "Pot should no longer be active");

        // Verify hunter received 60% of the pot amount
        uint256 hunterShare = (POT_AMOUNT * 60) / 100;
        assertEq(
            mockToken.balanceOf(hunter),
            (POT_FEE * 9) + hunterShare,
            "Hunter should receive 60% of pot"
        );

        // Verify MoneyPot still holds the remaining 40% (platform share)
        uint256 platformShare = POT_AMOUNT - hunterShare;
        uint256 creatorShare = (POT_FEE * 50) / 100;
        uint256 platformFeeShare = POT_FEE - creatorShare;
        assertEq(
            mockToken.balanceOf(address(moneyPot)),
            platformShare + platformFeeShare,
            "MoneyPot should hold platform share"
        );
    }

    function test_MultipleAttempts_DifficultyIncrease() public {
        // Create pot
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        // First attempt - difficulty should be 3
        vm.prank(hunter);
        uint256 attemptId1 = moneyPot.attemptPot(potId);

        MoneyPot.Attempt memory attempt1 = moneyPot.getAttempt(attemptId1);
        assertEq(
            attempt1.difficulty,
            3,
            "First attempt difficulty should be 3"
        );

        // Mark first attempt as failed
        vm.prank(verifier);
        moneyPot.attemptCompleted(attemptId1, false);

        // Second attempt - difficulty should be 4
        vm.prank(hunter);
        uint256 attemptId2 = moneyPot.attemptPot(potId);

        MoneyPot.Attempt memory attempt2 = moneyPot.getAttempt(attemptId2);
        assertEq(
            attempt2.difficulty,
            4,
            "Second attempt difficulty should be 4"
        );

        // Verify pot attempts count is 2
        MoneyPot.MoneyPotData memory pot = moneyPot.getPot(potId);
        assertEq(pot.attemptsCount, 2, "Pot attempts count should be 2");
    }

    function test_UnauthorizedAttemptCompleted() public {
        // Create pot and attempt
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        vm.prank(hunter);
        uint256 attemptId = moneyPot.attemptPot(potId);

        // Try to mark attempt as completed by non-verifier (should fail)
        vm.prank(hunter);
        vm.expectRevert(MoneyPot.Unauthorized.selector);
        moneyPot.attemptCompleted(attemptId, true);
    }

    function test_PotExpiry() public {
        // Ensure creator has enough approval for the new pot
        vm.prank(creator);
        mockToken.approve(address(moneyPot), POT_AMOUNT);

        // Create pot with short duration
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            1, // 1 second duration
            POT_FEE,
            ONE_FA_ADDRESS
        );

        // Fast forward time to expire the pot
        vm.warp(block.timestamp + 2);

        // Expire the pot
        vm.prank(creator);
        moneyPot.expirePot(potId);

        // Verify pot is no longer active
        MoneyPot.MoneyPotData memory pot = moneyPot.getPot(potId);
        assertEq(pot.isActive, false, "Pot should no longer be active");

        // Verify creator received their funds back
        // Creator should have: initial amount (POT_AMOUNT * 2) - pot amount (POT_AMOUNT) + pot amount back = POT_AMOUNT * 2
        assertEq(
            mockToken.balanceOf(creator),
            POT_AMOUNT * 2,
            "Creator should receive their funds back"
        );
    }

    function test_CannotAttemptExpiredPot() public {
        // Create pot with short duration
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            1, // 1 second duration
            POT_FEE,
            ONE_FA_ADDRESS
        );

        // Fast forward time to expire the pot
        vm.warp(block.timestamp + 2);

        // Try to attempt expired pot (should fail)
        vm.prank(hunter);
        vm.expectRevert(MoneyPot.ExpiredPot.selector);
        moneyPot.attemptPot(potId);
    }

    function test_CannotAttemptInactivePot() public {
        // Create pot
        vm.prank(creator);
        uint256 potId = moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_FEE,
            ONE_FA_ADDRESS
        );

        // Attempt and solve the pot
        vm.prank(hunter);
        uint256 attemptId = moneyPot.attemptPot(potId);

        vm.prank(verifier);
        moneyPot.attemptCompleted(attemptId, true);

        // Try to attempt inactive pot (should fail)
        vm.prank(hunter);
        vm.expectRevert(MoneyPot.PotNotActive.selector);
        moneyPot.attemptPot(potId);
    }

    function test_InvalidFee() public {
        // Try to create pot with fee greater than amount (should fail)
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(
                MoneyPot.InvalidFee.selector,
                moneyPot.MIN_FEE(),
                POT_AMOUNT + 1
            )
        );
        moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            POT_AMOUNT + 1, // Fee greater than amount
            ONE_FA_ADDRESS
        );

        // Try to create pot with fee less than minimum (should fail)
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(
                MoneyPot.InvalidFee.selector,
                moneyPot.MIN_FEE(),
                1
            )
        );
        moneyPot.createPot(
            POT_AMOUNT,
            POT_DURATION,
            1, // Fee less than minimum
            ONE_FA_ADDRESS
        );
    }
}
