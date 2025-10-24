// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MoneyPotToken.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title MoneyPot
 * @dev MoneyPot contract that inherits from MoneyPotToken and implements game mechanics
 * @notice This contract combines token proxy functionality with MoneyPot game mechanics
 *
 * Architecture:
 * - Inherits from MoneyPotToken for ERC20 proxy functionality
 * - Implements MoneyPot game logic with proxied token
 * - Maintains separation of concerns: token proxy logic in parent, game logic here
 */
contract MoneyPot is MoneyPotToken {
    // Constants
    uint256 public constant DIFFICULTY_MOD = 9;
    uint256 public constant HUNTER_SHARE_PERCENT = 60;
    uint256 public constant CREATOR_ENTRY_FEE_SHARE_PERCENT = 50;
    uint256 public constant MIN_FEE = 100 gwei;

    // State variables
    address public verifier;

    // Structs
    struct MoneyPotData {
        uint256 id;
        address creator;
        uint256 totalAmount;
        uint256 fee;
        uint256 createdAt;
        uint256 expiresAt;
        bool isActive;
        uint256 attemptsCount;
        address oneFaAddress;
    }

    struct Attempt {
        uint256 id;
        uint256 potId;
        address hunter;
        uint256 expiresAt;
        uint256 difficulty;
        bool isCompleted;
    }

    // State
    uint256 public nextPotId;
    uint256 public nextAttemptId;
    mapping(uint256 => MoneyPotData) public pots;
    mapping(uint256 => Attempt) public attempts;
    uint256[] private potIds;

    // Events
    event PotCreated(
        uint256 indexed id,
        address indexed creator,
        uint256 timestamp
    );
    event PotAttempted(
        uint256 indexed attemptId,
        uint256 indexed potId,
        address indexed hunter,
        uint256 timestamp
    );
    event PotSolved(
        uint256 indexed potId,
        address indexed hunter,
        uint256 timestamp
    );
    event PotFailed(
        uint256 indexed attemptId,
        address indexed hunter,
        uint256 timestamp
    );
    event PotExpired(
        uint256 indexed potId,
        address indexed creator,
        uint256 timestamp
    );

    // Errors
    error InvalidFee();
    error PotNotActive();
    error ExpiredPot();
    error NotExpired();
    error AttemptExpired();
    error AttemptCompleted();
    error Unauthorized();

    constructor() {}

    /**
     * @dev Initialize the MoneyPot contract
     * @param _token Address of the ERC20 token to use
     * @param _verifier Address of the verifier
     */
    function initialize(
        IERC20Metadata _token,
        address _verifier
    ) external onlyOwner {
        // Initialize the underlying token
        initializeToken(_token);

        verifier = _verifier;
    }

    function createPot(
        uint256 amount,
        uint256 durationSeconds,
        uint256 fee,
        address oneFaAddress
    ) external nonReentrant returns (uint256) {
        if (fee > amount || fee < MIN_FEE) revert InvalidFee();

        uint256 id = nextPotId++;

        pots[id] = MoneyPotData({
            id: id,
            creator: msg.sender,
            totalAmount: amount,
            fee: fee,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + durationSeconds,
            isActive: true,
            attemptsCount: 0,
            oneFaAddress: oneFaAddress
        });

        potIds.push(id);
        require(
            this.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit PotCreated(id, msg.sender, block.timestamp);
        return id;
    }

    function attemptPot(uint256 potId) external nonReentrant returns (uint256) {
        MoneyPotData storage pot = pots[potId];

        if (!pot.isActive) revert PotNotActive();
        if (block.timestamp >= pot.expiresAt) revert ExpiredPot();

        uint256 entryFee = pot.fee;
        uint256 creatorShare = (entryFee * CREATOR_ENTRY_FEE_SHARE_PERCENT) /
            100;
        uint256 platformShare = entryFee - creatorShare;

        // TODO:

        require(
            this.transferFrom(msg.sender, pot.creator, creatorShare),
            "Payment to creator failed"
        );
        require(
            this.transferFrom(msg.sender, address(this), platformShare),
            "Payment to platform failed"
        );

        pot.attemptsCount++;

        uint256 attemptId = nextAttemptId++;
        uint256 difficulty = (pot.attemptsCount % DIFFICULTY_MOD) + 3;

        attempts[attemptId] = Attempt({
            id: attemptId,
            potId: potId,
            hunter: msg.sender,
            expiresAt: block.timestamp + 300,
            difficulty: difficulty,
            isCompleted: false
        });

        emit PotAttempted(attemptId, potId, msg.sender, block.timestamp);
        return attemptId;
    }

    function attemptCompleted(
        uint256 attemptId,
        bool status
    ) external nonReentrant {
        if (msg.sender != verifier) revert Unauthorized();

        Attempt storage attempt = attempts[attemptId];
        MoneyPotData storage pot = pots[attempt.potId];

        if (!pot.isActive) revert PotNotActive();
        if (block.timestamp >= pot.expiresAt) revert ExpiredPot();
        if (block.timestamp >= attempt.expiresAt) revert AttemptExpired();
        if (attempt.isCompleted) revert AttemptCompleted();

        attempt.isCompleted = true;

        if (status) {
            pot.isActive = false;

            uint256 hunterShare = (pot.totalAmount * HUNTER_SHARE_PERCENT) /
                100;

            require(
                this.transfer(attempt.hunter, hunterShare),
                "Transfer failed"
            );
            // Note: We can't burn tokens from the underlying contract, so we keep the platform share
            // In a real implementation, you might want to send it to a treasury or burn mechanism

            emit PotSolved(attempt.potId, attempt.hunter, block.timestamp);
        } else {
            emit PotFailed(attemptId, attempt.hunter, block.timestamp);
        }
    }

    function expirePot(uint256 potId) external nonReentrant {
        MoneyPotData storage pot = pots[potId];

        if (!pot.isActive) revert PotNotActive();
        if (block.timestamp < pot.expiresAt) revert NotExpired();

        pot.isActive = false;
        require(this.transfer(pot.creator, pot.totalAmount), "Transfer failed");

        emit PotExpired(potId, pot.creator, block.timestamp);
    }

    // View functions
    function getBalance(address account) external view returns (uint256) {
        return this.balanceOf(account);
    }

    function getPots() external view returns (uint256[] memory) {
        return potIds;
    }

    function getActivePots() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < potIds.length; i++) {
            if (pots[potIds[i]].isActive) count++;
        }

        uint256[] memory active = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < potIds.length; i++) {
            if (pots[potIds[i]].isActive) {
                active[index++] = potIds[i];
            }
        }
        return active;
    }

    function getPot(uint256 potId) external view returns (MoneyPotData memory) {
        return pots[potId];
    }

    function getAttempt(
        uint256 attemptId
    ) external view returns (Attempt memory) {
        return attempts[attemptId];
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Update verifier address (only owner)
     */
    function updateVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier");
        verifier = _verifier;
    }
}
