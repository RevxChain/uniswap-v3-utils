// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUniswapV3PoolDerivedState} from "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolDerivedState.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {FixedPoint128} from "@uniswap/v3-core/contracts/libraries/FixedPoint128.sol";
import {FixedPoint96} from "@uniswap/v3-core/contracts/libraries/FixedPoint96.sol";
import {TickMath} from "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import {INonfungiblePositionManager} from "../lib/uniswap-v3-periphery-0.8/contracts/interfaces/INonfungiblePositionManager.sol";
import {LiquidityAmounts} from "../lib/uniswap-v3-periphery-0.8/contracts/libraries/LiquidityAmounts.sol";
import {OracleLibrary} from "../lib/uniswap-v3-periphery-0.8/contracts/libraries/OracleLibrary.sol";

import {FullMath} from "../lib/sir-trading-core/src/libraries/FullMath.sol";

import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";

library UniswapV3Utils {
    using FixedPointMathLib for uint256;
    using OracleLibrary for int24;
    using FullMath for uint256;
    using TickMath for *;
    
    uint32 constant private DEFAULT_TWAP_AGE = 15 minutes;

    function getTimeWeightedAmountOut(
        address pool,
        address tokenIn,
        uint256 amountIn
    ) internal view returns(uint256 amountOut) {
        return getTimeWeightedAmountOut(pool, tokenIn, amountIn, DEFAULT_TWAP_AGE, false);
    }

    function getForceTimeWeightedAmountOut(
        address pool,
        address tokenIn,
        uint256 amountIn
    ) internal view returns(uint256 amountOut) {
        return getTimeWeightedAmountOut(pool, tokenIn, amountIn, DEFAULT_TWAP_AGE, true);
    }

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

    function getValidTick(uint160 sqrtPriceX96, int24 tickSpacing) internal pure returns(int24 validTick) {
        if (sqrtPriceX96 >= TickMath.MAX_SQRT_RATIO) sqrtPriceX96 = TickMath.MAX_SQRT_RATIO - 1;
        if (TickMath.MIN_SQRT_RATIO > sqrtPriceX96) sqrtPriceX96 = TickMath.MIN_SQRT_RATIO;
        
        return getValidTick(sqrtPriceX96.getTickAtSqrtRatio(), tickSpacing);
    }

    function getValidTick(int24 tick, int24 tickSpacing) internal pure returns(int24 validTick) {
        int24 _remainder = tick % tickSpacing;
        validTick = tick - _remainder;

        if (_remainder > tickSpacing / 2) validTick = validTick + tickSpacing;
        if (validTick > TickMath.MAX_TICK) return TickMath.MAX_TICK - TickMath.MAX_TICK % tickSpacing;
        if (TickMath.MIN_TICK > validTick) return TickMath.MIN_TICK - TickMath.MIN_TICK % tickSpacing;
    }

    function getSqrtPriceX96(uint256 balance0, uint256 balance1) internal pure returns(uint160 sqrtPriceX96) {
        if (balance0 == 0 || balance1 == 0) return 0;

        (balance0, balance1) = (balance0.sqrt(), balance1.sqrt());

        uint256 _sqrtPriceX96 = balance1.mulDiv(FixedPoint96.Q96, balance0);

        if (TickMath.MAX_SQRT_RATIO > _sqrtPriceX96) {
            return TickMath.MIN_SQRT_RATIO >= _sqrtPriceX96 ? TickMath.MIN_SQRT_RATIO : uint160(_sqrtPriceX96);
        } else {
            return TickMath.MAX_SQRT_RATIO - 1;
        }
    }

    function getAccumulatedFees(
        address positionManager,
        address pool,
        uint256 tokenId
    ) internal view returns(uint256 amount0, uint256 amount1) {
        (
            /* uint96 _nonce */,
            /* address _operator */,
            /* address _token0 */,
            /* address _token1 */,
            /* uint24 _fee */,
            int24 _tickLower,
            int24 _tickUpper,
            uint128 _liquidity,
            uint256 _feeGrowthInside0LastX128,
            uint256 _feeGrowthInside1LastX128,
            /* uint128 _tokensOwed0 */,
            /* uint128 _tokensOwed1 */
        ) = INonfungiblePositionManager(positionManager).positions(tokenId);

        (
            /* uint160 _sqrtPriceX96 */,
            int24 _tick,
            /* uint16 _observationIndex */,
            /* uint16 _observationCardinality */,
            /* uint16 _observationCardinalityNext */,
            /* uint8 _feeProtocol */,
            /* bool _unlocked */
        ) = IUniswapV3Pool(pool).slot0();

        (
            uint256 _feeGrowthGlobal0X128,
            uint256 _feeGrowthGlobal1X128
        ) = (IUniswapV3Pool(pool).feeGrowthGlobal0X128(), IUniswapV3Pool(pool).feeGrowthGlobal1X128());

        (
            /* uint128 _liquidityGross */,
            /* int128 _liquidityNet */,
            uint256 _feeGrowthOutside0X128Lower,
            uint256 _feeGrowthOutside1X128Lower,
            /* int56 _tickCumulativeOutside */,
            /* uint160 _secondsPerLiquidityOutsideX128 */,
            /* uint32 _secondsOutside */,
            /* bool _initialized */
        ) = IUniswapV3Pool(pool).ticks(_tickLower);

        (
            /* uint128 _liquidityGross */,
            /* int128 _liquidityNet */,
            uint256 _feeGrowthOutside0X128Upper,
            uint256 _feeGrowthOutside1X128Upper,
            /* int56 _tickCumulativeOutside */,
            /* uint160 _secondsPerLiquidityOutsideX128 */,
            /* uint32 _secondsOutside */,
            /* bool _initialized */
        ) = IUniswapV3Pool(pool).ticks(_tickUpper);

        uint256 _feeGrowthInside0X128;
        uint256 _feeGrowthInside1X128;

        if (_tick < _tickLower) {
            _feeGrowthInside0X128 = _feeGrowthOutside0X128Lower - _feeGrowthOutside0X128Upper;
            _feeGrowthInside1X128 = _feeGrowthOutside1X128Lower - _feeGrowthOutside1X128Upper;
        } else if (_tick >= _tickUpper) {
            _feeGrowthInside0X128 = _feeGrowthOutside0X128Upper - _feeGrowthOutside0X128Lower;
            _feeGrowthInside1X128 = _feeGrowthOutside1X128Upper - _feeGrowthOutside1X128Lower;
        } else {
            _feeGrowthInside0X128 = _feeGrowthGlobal0X128 - _feeGrowthOutside0X128Lower - _feeGrowthOutside0X128Upper;
            _feeGrowthInside1X128 = _feeGrowthGlobal1X128 - _feeGrowthOutside1X128Lower - _feeGrowthOutside1X128Upper;
        }

        return (
            uint256(_feeGrowthInside0X128 - _feeGrowthInside0LastX128).mulDiv(_liquidity, FixedPoint128.Q128),
            uint256(_feeGrowthInside1X128 - _feeGrowthInside1LastX128).mulDiv(_liquidity, FixedPoint128.Q128)
        );
    }

    function getPositionLiquidity(
        address positionManager,
        address pool,
        uint256 tokenId
    ) internal view returns(uint256 amount0, uint256 amount1) {
        (
            /* uint96 _nonce */,
            /* address _operator */,
            /* address _token0 */,
            /* address _token1 */,
            /* uint24 _fee */,
            int24 _tickLower,
            int24 _tickUpper,
            uint128 _liquidity,
            /* uint256 _feeGrowthInside0LastX128 */,
            /* uint256 _feeGrowthInside1LastX128 */,
            /* uint128 _tokensOwed0 */,
            /* uint128 _tokensOwed1 */
        ) = INonfungiblePositionManager(positionManager).positions(tokenId);

        (
            /* uint160 _sqrtPriceX96 */,
            int24 _tick,
            /* uint16 _observationIndex */,
            /* uint16 _observationCardinality */,
            /* uint16 _observationCardinalityNext */,
            /* uint8 _feeProtocol */,
            /* bool _unlocked */
        ) = IUniswapV3Pool(pool).slot0();

        return LiquidityAmounts.getAmountsForLiquidity(
            _tick.getSqrtRatioAtTick(),
            _tickLower.getSqrtRatioAtTick(),
            _tickUpper.getSqrtRatioAtTick(),
            _liquidity
        );
    }

    function _getQuoteAtTick(address pool, int24 tick, address tokenIn, uint256 amountIn) private view returns(uint256 amountOut) {
        (address _token0, address _token1) = (IUniswapV3Pool(pool).token0(), IUniswapV3Pool(pool).token1());

        if (tokenIn != _token0 && tokenIn != _token1) return 0;

        return tick.getQuoteAtTick(uint128(amountIn), tokenIn, tokenIn == _token0 ? _token1 : _token0);
    }

    function _getRevertMessage(bytes memory response) private pure returns(string memory revertMessage) {
        if (response.length < 68) return "No reason";
        assembly { response := add(response, 0x04) }
        return abi.decode(response, (string));
    }

}