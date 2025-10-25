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
    // Pyth ETH/USD price feed ID (configurable)
    bytes32 public ethUsdPriceId;

    // State variables
    IPyth public pythInstance;
    bool public pythConfigured;

    // Events
    event PriceUpdated(
        bytes32 indexed priceId,
        int64 price,
        uint64 publishTime
    );

    // Errors
    error PythNotConfigured();
    error InvalidEthPrice();
    error InsufficientFee(uint256 required, uint256 sent);

    constructor() {}

    /**
     * @dev Initialize Pyth price feed
     * @param _pythInstance Address of the Pyth contract
     * @param _priceId Price feed ID for ETH/USD
     */
    function initializePyth(address _pythInstance, bytes32 _priceId) external {
        if (_pythInstance != address(0)) {
            pythInstance = IPyth(_pythInstance);
            ethUsdPriceId = _priceId;
            pythConfigured = true;
        } else {
            pythConfigured = false;
        }
    }

    /**
     * @dev Update price feeds and get latest price
     * @param priceUpdateData Price update data from Pyth
     * @param priceId Price feed ID to update
     * @return price Latest price
     * @return publishTime Price publish time
     */
    function updateAndGetPrice(
        bytes[] calldata priceUpdateData,
        bytes32 priceId
    ) external payable returns (int64 price, uint64 publishTime) {
        if (!pythConfigured) revert PythNotConfigured();

        // Get the fee required to update prices
        uint256 updateFee = pythInstance.getUpdateFee(priceUpdateData);
        if (msg.value < updateFee) {
            revert InsufficientFee(updateFee, msg.value);
        }

        // Update the price feeds with the provided data
        pythInstance.updatePriceFeeds{value: updateFee}(priceUpdateData);

        // Get the latest price
        PythStructs.Price memory priceData = pythInstance.getPriceUnsafe(
            priceId
        );

        emit PriceUpdated(
            priceId,
            priceData.price,
            uint64(priceData.publishTime)
        );

        // Refund excess payment
        if (msg.value > updateFee) {
            payable(msg.sender).transfer(msg.value - updateFee);
        }

        return (priceData.price, uint64(priceData.publishTime));
    }

    /**
     * @dev Get ETH amount for given USD cents using stale exchange rate
     * @param usdCents Amount in USD cents (e.g., 10 for $0.10)
     * @return Required ETH amount in wei
     */
    function getExchangeRateForUSD(
        uint256 usdCents
    ) internal view returns (uint256) {
        if (!pythConfigured) revert PythNotConfigured();

        PythStructs.Price memory ethPrice = pythInstance.getPriceUnsafe(
            ethUsdPriceId
        );

        if (ethPrice.price <= 0) revert InvalidEthPrice();

        // Convert USD cents to ETH using stale price
        // USD cents to wei: usdCents * 10^16 (since 1 USD = 10^18 wei, 1 cent = 10^16 wei)
        uint256 usdAmount = usdCents * 10 ** 16;

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
    function getCurrentPriceInUsd() external view returns (int64, int32) {
        if (!pythConfigured) revert PythNotConfigured();

        PythStructs.Price memory price = pythInstance.getPriceUnsafe(
            ethUsdPriceId
        );
        return (price.price, price.expo);
    }
}
