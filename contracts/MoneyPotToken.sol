// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MoneyPotToken
 * @dev Simple proxy token contract that wraps any underlying ERC20 token
 * @notice This contract provides proxy functionality for any ERC20 token
 *
 * Key Features:
 * - Proxy pattern for any underlying ERC20 token
 * - Safe transfer pattern using approve + transferFrom
 * - Reentrancy protection
 * - Owner-controlled operations
 */
contract MoneyPotToken is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    // The underlying ERC20 token being proxied
    IERC20Metadata public underlying;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Initialize the underlying token
     * @param _underlying The underlying ERC20 token to proxy
     */
    function initializeToken(IERC20Metadata _underlying) public onlyOwner {
        require(address(underlying) == address(0), "Already initialized");
        // require(address(_underlying) != address(0), "Invalid underlying token");
        underlying = _underlying;
    }

    // ============ PROXY FUNCTIONS ============

    /**
     * @dev Get the balance of an account from the underlying token
     * @param account The account to check balance for
     * @return The balance of the account
     */
    function balanceOf(address account) external view returns (uint256) {
        return underlying.balanceOf(account);
    }

    /**
     * @dev Get the total supply from the underlying token
     * @return The total supply of the underlying token
     */
    function totalSupply() external view returns (uint256) {
        return underlying.totalSupply();
    }

    /**
     * @dev Transfer tokens using the safe proxy pattern
     * User must first approve this contract to spend their tokens
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Whether the transfer was successful
     */
    function transfer(
        address to,
        uint256 amount
    ) external nonReentrant returns (bool) {
        // Use transferFrom with msg.sender as the from address
        // This requires the user to have approved this contract first
        underlying.safeTransferFrom(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Transfer tokens from one account to another using the safe proxy pattern
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Whether the transfer was successful
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external nonReentrant returns (bool) {
        underlying.safeTransferFrom(from, to, amount);
        return true;
    }

    /**
     * @dev Approve spender to spend tokens on behalf of msg.sender
     * @param spender The address to approve
     * @param amount The amount to approve
     * @return success Whether the approval was successful
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        return underlying.approve(spender, amount);
    }

    /**
     * @dev Get the allowance between owner and spender
     * @param owner The owner address
     * @param spender The spender address
     * @return The allowance amount
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return underlying.allowance(owner, spender);
    }

    /**
     * @dev Get the name of the underlying token
     * @return The name of the underlying token
     */
    function name() external view returns (string memory) {
        return underlying.name();
    }

    /**
     * @dev Get the symbol of the underlying token
     * @return The symbol of the underlying token
     */
    function symbol() external view returns (string memory) {
        return underlying.symbol();
    }

    /**
     * @dev Get the decimals of the underlying token
     * @return The decimals of the underlying token
     */
    function decimals() external view returns (uint8) {
        return underlying.decimals();
    }
}
