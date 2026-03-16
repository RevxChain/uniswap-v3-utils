// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUniswapV3PoolDerivedState} from "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolDerivedState.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {FixedPoint128} from "@uniswap/v3-core/contracts/libraries/FixedPoint128.sol";
import {FixedPoint96} from "@uniswap/v3-core/contracts/libraries/FixedPoint96.sol";
import {TickMath} from "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import {LiquidityAmounts} from "./libraries/uniswap-v3-periphery-0.8/LiquidityAmounts.sol";
import {OracleLibrary} from "./libraries/uniswap-v3-periphery-0.8/OracleLibrary.sol";

import {FullMath} from "./libraries/sir-trading-core/FullMath.sol";

import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";

import {INonfungiblePositionManagerTyped} from "./interfaces/INonfungiblePositionManagerTyped.sol";
import {IUniswapV3PoolTyped} from "./interfaces/IUniswapV3PoolTyped.sol";

/**
 * @title UniswapV3Utils
 * @notice Library providing utility functions for UniswapV3 interactions.
 * @dev This library handles complex calculations related to Time-Weighted Average Price (TWAP), liquidity position amounts,
 * price conversions, sqrtPriceX96, and fee accumulation. It uses fixed-point math for precise calculations without 
 * floating-point precision loss. All price calculations depend on pool data integrity and pool reliability. 
 * TWAP queries may revert if insufficient observation data exists. Use force-flag alternative functions cautiously as they fallback 
 * to spot price.
 * 
 * IMPORTANT: To increase the flexibility of the library usage, its functions DO NOT verify the correctness of the input data and 
 * DO NOT throw errors in case of unexpected behavior. You MUST validate the input before calling the library function and validate 
 * the output after.
 */
library UniswapV3Utils {
    using FixedPointMathLib for uint256;
    using OracleLibrary for int24;
    using FullMath for uint256;
    using TickMath for *;
    
    /// @notice Default TWAP observation window of 15 minutes used when no specific time window is provided.
    uint32 constant private DEFAULT_TWAP_AGE = 15 minutes;

    /**
     * @notice Calculates the output amount for a token swap using the default TWAP observation window.
     * @dev Delegates to the full {getTimeWeightedAmountOut} function with {DEFAULT_TWAP_AGE} and {force}=false.
     * @param pool Address of the {UniswapV3Pool} to query for price data.
     * @param tokenIn Address of the input token being quoted.
     * @param amountIn Amount of {tokenIn} to quote.
     * @return amountOut Estimated output amount of the paired token based on TWAP quote.
     * @custom:reverts If the {UniswapV3Pool} has insufficient observation data for {DEFAULT_TWAP_AGE} window.
     */
    function getTimeWeightedAmountOut(
        address pool,
        address tokenIn,
        uint256 amountIn
    ) internal view returns(uint256 amountOut) {
        return getTimeWeightedAmountOut(pool, tokenIn, amountIn, DEFAULT_TWAP_AGE, false);
    }

    /**
     * @notice Calculates the output amount using TWAP with fallback to spot price if observation data unavailable.
     * @dev Delegates to the full {getTimeWeightedAmountOut} function with {DEFAULT_TWAP_AGE} and {force}=true.
     * Returns spot price quote if TWAP observation data is insufficient (does not revert).
     * Use cautiously as spot price is susceptible to manipulation.
     * @param pool Address of the {UniswapV3Pool} to query for price data.
     * @param tokenIn Address of the input token being quoted.
     * @param amountIn Amount of {tokenIn} to quote.
     * @return amountOut Estimated output amount based on TWAP if available, otherwise current spot price.
     */
    function getForceTimeWeightedAmountOut(
        address pool,
        address tokenIn,
        uint256 amountIn
    ) internal view returns(uint256 amountOut) {
        return getTimeWeightedAmountOut(pool, tokenIn, amountIn, DEFAULT_TWAP_AGE, true);
    }

    /**
     * @notice Calculates the output amount for a token swap using a custom TWAP observation window with optional force fallback.
     * @dev Performs a staticcall to {UniswapV3Pool.observe} to get historical tick data.
     * Calculates the average tick over the specified {secondsAgo} window, then quotes output at that average.
     * If TWAP calculation succeeds, returns the TWAP-based quote. If {force} is false and observation fails,
     * the provided revert message from the pool is decoded and re-thrown. If {force} is true, falls back to spot price.
     * @param pool Address of the {UniswapV3Pool} to query for TWAP data.
     * @param tokenIn Address of the input token being quoted.
     * @param amountIn Amount of {tokenIn} to quote.
     * @param secondsAgo Number of seconds into the past to use for TWAP calculation window.
     * @param force If true, falls back to current spot price if {UniswapV3Pool} observation fails;
     *        if false, reverts with pool's revert message if observation fails.
     * @return amountOut Estimated output amount based on TWAP average price, or spot price if {force}=true and observation fails.
     * @custom:reverts If {force}=false and observation fails, reverts with encoded error message from {UniswapV3Pool}.
     */
    function getTimeWeightedAmountOut(
        address pool,
        address tokenIn,
        uint256 amountIn,
        uint32 secondsAgo,
        bool force
    ) internal view returns(uint256 amountOut) {
        uint32[] memory _secondsAgos = new uint32[](2);
        _secondsAgos[0] = secondsAgo;
        _secondsAgos[1] = 0;

        (
            bool _observeResult,
            bytes memory _observeResponse
        ) = pool.staticcall(abi.encodeCall(IUniswapV3PoolDerivedState.observe, (_secondsAgos)));

        if (_observeResult) {
            (
                int56[] memory _tickCumulatives,
                /* uint160[] memory _secondsPerLiquidityCumulativeX128s */
            ) = abi.decode(_observeResponse, (int56[], uint160[]));

            int56 _tickCumulativesDelta = _tickCumulatives[1] - _tickCumulatives[0];
            int24 _tick = int24(_tickCumulativesDelta / int56(uint56(secondsAgo)));

            if (_tickCumulativesDelta < 0 && (_tickCumulativesDelta % int56(uint56(secondsAgo)) != 0)) _tick--;

            return _getQuoteAtTick(pool, _tick, tokenIn, amountIn);
        } else {
            if (force) {
                return getAmountOut(pool, tokenIn, amountIn);
            } else {
                revert(_getRevertMessage(_observeResponse));
            }
        }
    }

    /**
     * @notice Calculates the output amount for a token swap at the current spot price.
     * @dev Retrieves the current tick from the pool's {slot0} and quotes the output amount at that tick price.
     * This uses the instantaneous spot price without time-weighted averaging, making it susceptible to
     * manipulation attacks. Only use when TWAP is unavailable or immediate pricing is required.
     * @param pool Address of the {UniswapV3Pool} to query current price.
     * @param tokenIn Address of the input token being quoted.
     * @param amountIn Amount of {tokenIn} to quote.
     * @return amountOut Output amount of the paired token at current spot price.
     */
    function getAmountOut(address pool, address tokenIn, uint256 amountIn) internal view returns(uint256 amountOut) {
        (
            /* uint160 _sqrtPriceX96 */,
            int24 _tick,
            /* uint16 _observationIndex */,
            /* uint16 _observationCardinality */,
            /* uint16 _observationCardinalityNext */,
            /* uint8 _feeProtocol */,
            /* bool _unlocked */
        ) = IUniswapV3Pool(pool).slot0();

        return _getQuoteAtTick(pool, _tick, tokenIn, amountIn);
    }

    /**
     * @notice Calculates the upper price boundary (sqrtPriceX96) for a liquidity position.
     * @dev Computes the maximum price at which both token amounts would be consumed based on the current price.
     * Uses fixed-point math to handle the Q96 precision format. Clamped to {TickMath.MAX_SQRT_RATIO - 1} to ensure validity.
     * @param lowerSqrtPriceX96 The lower price boundary in sqrtPriceX96 format (Q64.96).
     * @param currentSqrtPriceX96 The pool's current price in sqrtPriceX96 format (Q64.96).
     * @param amount0 Amount of token0 available for the position.
     * @param amount1 Amount of token1 available for the position.
     * @return upperSqrtPriceX96 The calculated upper price boundary clamped to valid range, in sqrtPriceX96 format.
     * 
     * IMPORTANT: In cases of very wide ranges, very narrow ranges, as well as extremely disproportionate amounts, the result may
     * differ significantly from the benchmark. Always verify remaining amounts (dust) after using this calculation for interaction.
     */
    function getUpperSqrtPriceX96(
        uint160 lowerSqrtPriceX96,
        uint160 currentSqrtPriceX96,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns(uint160 upperSqrtPriceX96) {
        uint256 _liquidity = amount1.mulDiv(FixedPoint96.Q96, uint256(currentSqrtPriceX96 - lowerSqrtPriceX96));
        uint256 _numerator = _liquidity.mulDiv(uint256(currentSqrtPriceX96), FixedPoint96.Q96);
        uint256 _denominator = amount0.mulDiv(uint256(currentSqrtPriceX96), FixedPoint96.Q96);

        _denominator = _denominator >= _liquidity ? 1 : _liquidity - _denominator;

        (bool _success, uint256 _upperSqrtPriceX96) = _numerator.tryMulDiv(FixedPoint96.Q96, _denominator);

        if (_success && TickMath.MAX_SQRT_RATIO > _upperSqrtPriceX96) {
            return _upperSqrtPriceX96 > currentSqrtPriceX96 ? uint160(_upperSqrtPriceX96) : currentSqrtPriceX96;
        } else {
            return TickMath.MAX_SQRT_RATIO - 1;
        }
    }

    /**
     * @notice Calculates the lower price boundary (sqrtPriceX96) for a liquidity position.
     * @dev Computes the minimum price at which both token amounts would be consumed based on the current price.
     * Uses fixed-point math to handle the Q96 precision format. Clamped to {TickMath.MIN_SQRT_RATIO} to ensure validity.
     * Mirror function to {getUpperSqrtPriceX96} for determining position lower bound.
     * @param currentSqrtPriceX96 The pool's current price in sqrtPriceX96 format (Q64.96).
     * @param upperSqrtPriceX96 The upper price boundary in sqrtPriceX96 format (Q64.96).
     * @param amount0 Amount of token0 available for the position.
     * @param amount1 Amount of token1 available for the position.
     * @return lowerSqrtPriceX96 The calculated lower price boundary clamped to valid range, in sqrtPriceX96 format.
     * 
     * IMPORTANT: In cases of very wide ranges, very narrow ranges, as well as extremely disproportionate amounts, the result may
     * differ significantly from the benchmark. Always verify remaining amounts (dust) after using this calculation for interaction.
     */
    function getLowerSqrtPriceX96(
        uint160 currentSqrtPriceX96,
        uint160 upperSqrtPriceX96,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns(uint160 lowerSqrtPriceX96) {
        uint256 _numerator = amount1 - amount1.mulDiv(uint256(currentSqrtPriceX96), uint256(upperSqrtPriceX96));
        uint256 _denominator = amount0.mulDiv(uint256(currentSqrtPriceX96), FixedPoint96.Q96);
        uint256 _diffSqrtPriceX96 = _numerator.mulDiv(FixedPoint96.Q96, _denominator == 0 ? 1 : _denominator);

        if (_diffSqrtPriceX96 >= currentSqrtPriceX96) return TickMath.MIN_SQRT_RATIO;

        lowerSqrtPriceX96 = uint160(currentSqrtPriceX96 - _diffSqrtPriceX96);

        if (lowerSqrtPriceX96 > TickMath.MIN_SQRT_RATIO) {
            return lowerSqrtPriceX96 > currentSqrtPriceX96 ? currentSqrtPriceX96 : lowerSqrtPriceX96;
        } else {
            return TickMath.MIN_SQRT_RATIO;
        }
    }

    /**
     * @notice Calculates the proportional amounts of both tokens required to provide liquidity within a specified price range.
     * @dev Adjusts the input amounts to match the pool's current price and the specified tick range.
     * If current tick is outside the range, rebalances amounts to consist of only the token needed at current price.
     * Within range, calculates the optimal ratio based on price range boundaries and current position.
     * If {tickLower} > {tickUpper}, returns (0, 0) as invalid range.
     * @param pool Address of the {UniswapV3Pool} to fetch current price and tick range.
     * @param amount0 Maximum amount of token0 available.
     * @param amount1 Maximum amount of token1 available.
     * @param tickLower Lower price boundary tick for the liquidity position.
     * @param tickUpper Upper price boundary tick for the liquidity position.
     * @return amount0Required Proportional amount of token0 required for balanced liquidity provision.
     * @return amount1Required Proportional amount of token1 required for balanced liquidity provision.
     * 
     * IMPORTANT: In cases of very wide ranges, very narrow ranges, as well as extremely disproportionate amounts, the result may
     * differ significantly from the benchmark. Always verify remaining amounts (dust) after using this calculation for interaction.
     */
    function getProportionalAmounts(
        address pool,
        uint256 amount0,
        uint256 amount1,
        int24 tickLower,
        int24 tickUpper
    ) internal view returns(uint256 amount0Required, uint256 amount1Required) {
        if (tickLower > tickUpper) return (0, 0);

        (
            address _token0,
            address _token1,
            int24 _tick
        ) = (IUniswapV3Pool(pool).token0(), IUniswapV3Pool(pool).token1(), IUniswapV3PoolTyped(pool).slot0().tick);

        uint256 _singleAmount = _tick >= 0 ?
            _tick.getQuoteAtTick(uint128(amount1), _token1, _token0) + amount0 :
            _tick.getQuoteAtTick(uint128(amount0), _token0, _token1) + amount1;

        return calculateProportionalAmounts(
            _tick,
            _token0,
            _token1,
            _singleAmount,
            tickLower.getSqrtRatioAtTick(),
            tickUpper.getSqrtRatioAtTick()
        );
    }

    /**
     * @notice Finds the nearest valid tick for a given square root price, aligned to the pool's tick spacing.
     * @dev Converts the {sqrtPriceX96} to a tick value and delegates to {getValidTick} for alignment.
     * First clamps {sqrtPriceX96} to valid range [TickMath.MIN_SQRT_RATIO, TickMath.MAX_SQRT_RATIO - 1].
     * @param sqrtPriceX96 The square root of the price in Q64.96 format.
     * @param tickSpacing The tick spacing for the position (e.g., 1, 10, 60, 200).
     * @return validTick The nearest tick to the given price, rounded to align with {tickSpacing}.
     */
    function getValidTick(uint160 sqrtPriceX96, int24 tickSpacing) internal pure returns(int24 validTick) {
        if (sqrtPriceX96 >= TickMath.MAX_SQRT_RATIO) sqrtPriceX96 = TickMath.MAX_SQRT_RATIO - 1;
        if (TickMath.MIN_SQRT_RATIO > sqrtPriceX96) sqrtPriceX96 = TickMath.MIN_SQRT_RATIO;
        
        return getValidTick(sqrtPriceX96.getTickAtSqrtRatio(), tickSpacing);
    }

    /**
     * @notice Finds the nearest valid tick aligned to the given tick spacing.
     * @dev Rounds the provided {tick} to the nearest multiple of {tickSpacing}.
     * Clamps final result to [{TickMath.MIN_TICK}, {TickMath.MAX_TICK}] adjusted for spacing.
     * @param tick The target tick to align.
     * @param tickSpacing The tick spacing for alignment (e.g., 1, 10, 60, 200).
     * @return validTick The nearest tick aligned to {tickSpacing}, clamped to valid tick range.
     */
    function getValidTick(int24 tick, int24 tickSpacing) internal pure returns(int24 validTick) {
        int24 _remainder = tick % tickSpacing;
        validTick = tick - _remainder;

        if (_remainder > tickSpacing / 2) validTick = validTick + tickSpacing;
        if (validTick > TickMath.MAX_TICK) return TickMath.MAX_TICK - TickMath.MAX_TICK % tickSpacing;
        if (TickMath.MIN_TICK > validTick) return TickMath.MIN_TICK - TickMath.MIN_TICK % tickSpacing;
    }

    /**
     * @notice Calculates the effective square root of price (in Q64.96 format) from the ratio of two token amounts.
     * @dev Computes sqrtPriceX96 = sqrt(amount1 / amount0) * Q96 using fixed-point arithmetic.
     * Returns 0 if either {amount0} or {amount1} is 0 (undefined price ratio).
     * Result is clamped to the valid range [TickMath.MIN_SQRT_RATIO, TickMath.MAX_SQRT_RATIO - 1].
     * @param amount0 Maximum amount of token0 available.
     * @param amount1 Maximum amount of token1 available.
     * @return sqrtPriceX96 The calculated square root price in Q64.96 format, or 0 if ratio undefined.
     * 
     * IMPORTANT: In cases of very wide ranges, very narrow ranges, as well as extremely disproportionate amounts, the result may
     * differ significantly from the benchmark. Always verify remaining amounts (dust) after using this calculation for interaction.
     */
    function getSqrtPriceX96(uint256 amount0, uint256 amount1) internal pure returns(uint160 sqrtPriceX96) {
        if (amount0 == 0 || amount1 == 0) return 0;

        (amount0, amount1) = (amount0.sqrt(), amount1.sqrt());

        uint256 _sqrtPriceX96 = amount1.mulDiv(FixedPoint96.Q96, amount0);

        if (TickMath.MAX_SQRT_RATIO > _sqrtPriceX96) {
            return TickMath.MIN_SQRT_RATIO > _sqrtPriceX96 ? TickMath.MIN_SQRT_RATIO : uint160(_sqrtPriceX96);
        } else {
            return TickMath.MAX_SQRT_RATIO - 1;
        }
    }

    /**
     * @notice Calculates the accumulated trading fees for a UniswapV3 liquidity position.
     * @dev Queries the position's tick range and current pool tick to calculate accumulated fees in the position.
     * @param positionManager Address of the {NonfungiblePositionManager} holding the position.
     * @param pool Address of the {UniswapV3Pool} where position resides.
     * @param tokenId The NFT token ID representing the liquidity position.
     * @return amount0 Accumulated fees in token0.
     * @return amount1 Accumulated fees in token1.
     */
    function getAccumulatedFees(
        address positionManager,
        address pool,
        uint256 tokenId
    ) internal view returns(uint256 amount0, uint256 amount1) {
        INonfungiblePositionManagerTyped _positionManager = INonfungiblePositionManagerTyped(positionManager);

        uint256 _feeGrowthInside0X128;
        uint256 _feeGrowthInside1X128;

        {
            int24 _tickLower = _positionManager.positions(tokenId).tickLower;
            int24 _tickUpper = _positionManager.positions(tokenId).tickUpper;

            int24 _tick = IUniswapV3PoolTyped(pool).slot0().tick;

            uint256 _feeGrowthOutside0X128Lower = IUniswapV3PoolTyped(pool).ticks(_tickLower).feeGrowthOutside0X128;
            uint256 _feeGrowthOutside1X128Lower = IUniswapV3PoolTyped(pool).ticks(_tickLower).feeGrowthOutside1X128;

            uint256 _feeGrowthOutside0X128Upper = IUniswapV3PoolTyped(pool).ticks(_tickUpper).feeGrowthOutside0X128;
            uint256 _feeGrowthOutside1X128Upper = IUniswapV3PoolTyped(pool).ticks(_tickUpper).feeGrowthOutside1X128;

            if (_tick < _tickLower) {
                _feeGrowthInside0X128 = _feeGrowthOutside0X128Lower - _feeGrowthOutside0X128Upper;
                _feeGrowthInside1X128 = _feeGrowthOutside1X128Lower - _feeGrowthOutside1X128Upper;
            } else if (_tick >= _tickUpper) {
                _feeGrowthInside0X128 = _feeGrowthOutside0X128Upper - _feeGrowthOutside0X128Lower;
                _feeGrowthInside1X128 = _feeGrowthOutside1X128Upper - _feeGrowthOutside1X128Lower;
            } else {
                _feeGrowthInside0X128 = IUniswapV3Pool(pool).feeGrowthGlobal0X128() - _feeGrowthOutside0X128Lower - _feeGrowthOutside0X128Upper;
                _feeGrowthInside1X128 = IUniswapV3Pool(pool).feeGrowthGlobal1X128() - _feeGrowthOutside1X128Lower - _feeGrowthOutside1X128Upper;
            }
        }

        uint128 _liquidity = _positionManager.positions(tokenId).liquidity;

        return (
            (_feeGrowthInside0X128 - _positionManager.positions(tokenId).feeGrowthInside0LastX128).mulDiv(_liquidity, FixedPoint128.Q128),
            (_feeGrowthInside1X128 - _positionManager.positions(tokenId).feeGrowthInside1LastX128).mulDiv(_liquidity, FixedPoint128.Q128)
        );
    }

    /**
     * @notice Calculates the actual token amounts (amount0 and amount1) represented by a position's liquidity.
     * @dev Uses the position's liquidity, tick boundaries, and current pool price to compute the token amounts.
     * @param positionManager Address of the {NonfungiblePositionManager} holding the position.
     * @param pool Address of the {UniswapV3Pool} where position resides.
     * @param tokenId The NFT token ID representing the liquidity position.
     * @return amount0 Current amount of token0 represented by the position's liquidity.
     * @return amount1 Current amount of token1 represented by the position's liquidity.
     */
    function getPositionLiquidity(
        address positionManager,
        address pool,
        uint256 tokenId
    ) internal view returns(uint256 amount0, uint256 amount1) {
        INonfungiblePositionManagerTyped.Position memory _position = INonfungiblePositionManagerTyped(positionManager).positions(tokenId);

        return LiquidityAmounts.getAmountsForLiquidity(
            IUniswapV3PoolTyped(pool).slot0().tick.getSqrtRatioAtTick(),
            _position.tickLower.getSqrtRatioAtTick(),
            _position.tickUpper.getSqrtRatioAtTick(),
            _position.liquidity
        );
    }

    /**
     * @notice Internal helper calculating proportional token amounts for a position within specified price bounds.
     * @param currentTick The pool's current tick.
     * @param token0 Address of token0.
     * @param token1 Address of token1.
     * @param amount Total single amount available to split between tokens.
     * @param lowerSqrtPriceX96 Lower price boundary in sqrtPriceX96 format.
     * @param upperSqrtPriceX96 Upper price boundary in sqrtPriceX96 format.
     * @return amount0Required Calculated proportional amount of token0.
     * @return amount1Required Calculated proportional amount of token1.
     */
    function calculateProportionalAmounts(
        int24 currentTick,
        address token0,
        address token1,
        uint256 amount,
        uint160 lowerSqrtPriceX96,
        uint160 upperSqrtPriceX96
    ) internal pure returns(uint256 amount0Required, uint256 amount1Required) {
        uint160 _currentSqrtPriceX96 = currentTick.getSqrtRatioAtTick();

        if (_currentSqrtPriceX96 <= lowerSqrtPriceX96) {
            return currentTick >= 0 ? (amount, 0) : (currentTick.getQuoteAtTick(uint128(amount), token1, token0), 0);
        } else if (_currentSqrtPriceX96 < upperSqrtPriceX96) {
            uint256 _swapAmount;

            {
                uint256 _numerator = uint256(upperSqrtPriceX96).mulDiv(_currentSqrtPriceX96 - lowerSqrtPriceX96, FixedPoint96.Q96);
                uint256 _denominator = uint256(_currentSqrtPriceX96).mulDiv(upperSqrtPriceX96 - _currentSqrtPriceX96, FixedPoint96.Q96);
                uint256 _temp = _numerator.mulDiv(FixedPoint96.Q96, _denominator);
                uint256 _factor = FixedPoint96.Q96.mulDiv(FixedPoint96.Q96, _temp + FixedPoint96.Q96);
                _swapAmount = amount.mulDiv(FixedPoint96.Q96 - _factor, FixedPoint96.Q96);
            }

            return currentTick >= 0 ?
                (amount - _swapAmount, currentTick.getQuoteAtTick(uint128(_swapAmount), token0, token1)) :
                (currentTick.getQuoteAtTick(uint128(_swapAmount), token1, token0), amount - _swapAmount);
        } else {
            return currentTick >= 0 ? (0, currentTick.getQuoteAtTick(uint128(amount), token0, token1)) : (0, amount);
        }
    }

    /**
     * @notice Calculates the output amount for a swap at a specific pool tick price.
     * @dev Internal helper that validates that {tokenIn} is one of the pool's tokens and quotes the swap output.
     * Returns 0 if {tokenIn} is neither {token0} nor {token1}.
     * @param pool Address of the {UniswapV3Pool}.
     * @param tick The tick at which to calculate the price quote.
     * @param tokenIn Address of the input token.
     * @param amountIn Amount of {tokenIn} to quote.
     * @return amountOut Calculated output amount of the paired token at the given {tick}.
     */
    function _getQuoteAtTick(address pool, int24 tick, address tokenIn, uint256 amountIn) private view returns(uint256 amountOut) {
        (address _token0, address _token1) = (IUniswapV3Pool(pool).token0(), IUniswapV3Pool(pool).token1());

        if (tokenIn != _token0 && tokenIn != _token1) return 0;

        return tick.getQuoteAtTick(uint128(amountIn), tokenIn, tokenIn == _token0 ? _token1 : _token0);
    }

    /**
     * @notice Extracts and decodes the revert message from encoded call response data.
     * @param response The encoded response bytes from a failed call.
     * @return revertMessage The decoded error message string, or "No reason" if not found.
     */
    function _getRevertMessage(bytes memory response) private pure returns(string memory revertMessage) {
        if (response.length < 68) return "No reason";
        assembly { response := add(response, 0x04) }
        return abi.decode(response, (string));
    }
}