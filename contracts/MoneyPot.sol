// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MoneyPot
 * @dev A contract for pooling funds with deposit and withdrawal functionality
 */
contract MoneyPot is Ownable, ReentrancyGuard, Pausable {
    // State variables
    mapping(address => uint256) public balances;
    mapping(address => bool) public hasDeposited;

    uint256 public totalDeposits;
    uint256 public totalParticipants;
    uint256 public minimumDeposit;
    uint256 public maximumDeposit;

    // Fee configuration
    uint256 public feePercentage; // in basis points (100 = 1%)
    address public feeRecipient;
    uint256 public totalFeesCollected;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event FeeCollected(uint256 amount, uint256 timestamp);
    event MinimumDepositUpdated(uint256 newMinimum);
    event MaximumDepositUpdated(uint256 newMaximum);
    event FeePercentageUpdated(uint256 newFeePercentage);
    event FeeRecipientUpdated(address newRecipient);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(
        uint256 _minimumDeposit,
        uint256 _maximumDeposit,
        uint256 _feePercentage,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_minimumDeposit > 0, "Minimum deposit must be greater than 0");
        require(
            _maximumDeposit >= _minimumDeposit,
            "Maximum must be >= minimum"
        );
        require(_feePercentage <= 1000, "Fee cannot exceed 10%");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        minimumDeposit = _minimumDeposit;
        maximumDeposit = _maximumDeposit;
        feePercentage = _feePercentage;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Deposit funds into the pot
     */
    function deposit() external payable nonReentrant whenNotPaused {
        require(msg.value >= minimumDeposit, "Deposit below minimum");
        require(msg.value <= maximumDeposit, "Deposit exceeds maximum");

        uint256 fee = (msg.value * feePercentage) / 10000;
        uint256 netDeposit = msg.value - fee;

        // Update user balance
        if (!hasDeposited[msg.sender]) {
            hasDeposited[msg.sender] = true;
            totalParticipants++;
        }

        balances[msg.sender] += netDeposit;
        totalDeposits += netDeposit;

        // Handle fee
        if (fee > 0) {
            totalFeesCollected += fee;
            payable(feeRecipient).transfer(fee);
            emit FeeCollected(fee, block.timestamp);
        }

        emit Deposited(msg.sender, netDeposit, block.timestamp);
    }

    /**
     * @dev Withdraw funds from the pot
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        // Check if user has withdrawn all funds
        if (balances[msg.sender] == 0) {
            hasDeposited[msg.sender] = false;
            totalParticipants--;
        }

        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Withdraw all funds
     */
    function withdrawAll() external nonReentrant whenNotPaused {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        balances[msg.sender] = 0;
        totalDeposits -= balance;
        hasDeposited[msg.sender] = false;
        totalParticipants--;

        payable(msg.sender).transfer(balance);

        emit Withdrawn(msg.sender, balance, block.timestamp);
    }

    /**
     * @dev Emergency withdraw (no checks, used in case of emergency)
     */
    function emergencyWithdraw() external nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        balances[msg.sender] = 0;
        totalDeposits -= balance;

        if (hasDeposited[msg.sender]) {
            hasDeposited[msg.sender] = false;
            totalParticipants--;
        }

        payable(msg.sender).transfer(balance);

        emit EmergencyWithdraw(msg.sender, balance);
    }

    /**
     * @dev Get user balance
     * @param user Address of the user
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    /**
     * @dev Get pot statistics
     */
    function getPotStats()
        external
        view
        returns (
            uint256 _totalDeposits,
            uint256 _totalParticipants,
            uint256 _totalFeesCollected,
            uint256 _contractBalance
        )
    {
        return (
            totalDeposits,
            totalParticipants,
            totalFeesCollected,
            address(this).balance
        );
    }

    // Admin functions

    /**
     * @dev Update minimum deposit amount
     * @param _minimumDeposit New minimum deposit
     */
    function setMinimumDeposit(uint256 _minimumDeposit) external onlyOwner {
        require(_minimumDeposit > 0, "Minimum must be greater than 0");
        require(
            _minimumDeposit <= maximumDeposit,
            "Minimum cannot exceed maximum"
        );
        minimumDeposit = _minimumDeposit;
        emit MinimumDepositUpdated(_minimumDeposit);
    }

    /**
     * @dev Update maximum deposit amount
     * @param _maximumDeposit New maximum deposit
     */
    function setMaximumDeposit(uint256 _maximumDeposit) external onlyOwner {
        require(
            _maximumDeposit >= minimumDeposit,
            "Maximum must be >= minimum"
        );
        maximumDeposit = _maximumDeposit;
        emit MaximumDepositUpdated(_maximumDeposit);
    }

    /**
     * @dev Update fee percentage
     * @param _feePercentage New fee percentage in basis points
     */
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Fee cannot exceed 10%");
        feePercentage = _feePercentage;
        emit FeePercentageUpdated(_feePercentage);
    }

    /**
     * @dev Update fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Receive function to accept direct ETH transfers
     */
    receive() external payable {
        revert("Direct transfers not allowed, use deposit()");
    }

    /**
     * @dev Fallback function
     */
    fallback() external payable {
        revert("Direct transfers not allowed, use deposit()");
    }
}
