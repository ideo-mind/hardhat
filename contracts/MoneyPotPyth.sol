// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title MoneyPotPyth
 * @dev Simple Pyth integration for exchange rates
 * @notice Provides ETH/USD exchange rate functionality for MoneyPot
 */
contract MoneyPotPyth {
    // Constants
    uint256 public constant ENTRY_FEE_USD_CENTS = 10; // $0.10 in cents

    // Pyth ETH/USD price feed ID (mainnet)
    bytes32 public constant ETH_USD_PRICE_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // State variables
    IPyth public pythInstance;
    bool public pythConfigured;

    // Errors
    error PythNotConfigured();
    error InvalidEthPrice();

    /**
     * @dev Initialize Pyth price feed
     * @param _pythInstance Address of the Pyth contract
     */
    function initializePyth(address _pythInstance) external {
        if (_pythInstance != address(0)) {
            pythInstance = IPyth(_pythInstance);
            pythConfigured = true;
        } else {
            pythConfigured = false;
        }
    }

    /**
     * @dev Get stale ETH/USD exchange rate (no update needed)
     * @return Required ETH amount in wei for $0.10 entry fee
     */
    function getEthForEntryFee() internal view returns (uint256) {
        if (!pythConfigured) revert PythNotConfigured();

        PythStructs.Price memory ethPrice = pythInstance.getPriceUnsafe(
            ETH_USD_PRICE_ID
        );

        if (ethPrice.price <= 0) revert InvalidEthPrice();

        // Convert $0.10 to ETH using stale price
        // $0.10 = 10 cents = 10 * 10^16 wei (in USD terms)
        uint256 usdAmount = ENTRY_FEE_USD_CENTS * 10 ** 16; // $0.10 in wei

        // Handle price scaling: Pyth prices are scaled by 10^expo
        uint256 scaledPrice;
        if (ethPrice.expo < 0) {
            scaledPrice =
                uint256(uint64(ethPrice.price)) /
                (10 ** uint256(uint32(-ethPrice.expo)));
        } else {
            scaledPrice =
                uint256(uint64(ethPrice.price)) *
                (10 ** uint256(uint32(ethPrice.expo)));
        }

        return (usdAmount * 10 ** 18) / scaledPrice;
    }

    /**
     * @dev Get current ETH/USD price from Pyth (stale)
     * @return Current ETH price in USD
     */
    function getCurrentEthUsdPrice() external view returns (int64, int32) {
        if (!pythConfigured) revert PythNotConfigured();

        PythStructs.Price memory price = pythInstance.getPriceUnsafe(
            ETH_USD_PRICE_ID
        );
        return (price.price, price.expo);
    }
}
