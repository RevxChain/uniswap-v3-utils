// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TickMath} from "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import {UniswapV3Utils} from "../UniswapV3Utils.sol";

contract UniswapV3UtilsMock {
    using TickMath for *;

    function getTimeWeightedAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getTimeWeightedAmountOut(pool, tokenIn, amountIn);
    }

    function getForceTimeWeightedAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getForceTimeWeightedAmountOut(pool, tokenIn, amountIn);
    }

    function getTimeWeightedAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn, 
        uint32 secondsAgo,
        bool force
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getTimeWeightedAmountOut(pool, tokenIn, amountIn, secondsAgo, force);
    }

    function getAmountOut(address pool, address tokenIn, uint256 amountIn) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getAmountOut(pool, tokenIn, amountIn);
    }

    function getUpperSqrtPriceX96(
        uint160 lowerSqrtPriceX96, 
        uint160 currentSqrtPriceX96,
        uint256 amount0,
        uint256 amount1
    ) external pure returns(uint160 upperSqrtPriceX96) {
        return UniswapV3Utils.getUpperSqrtPriceX96(
            lowerSqrtPriceX96, 
            currentSqrtPriceX96,
            amount0,
            amount1
        );
    }

    function getLowerSqrtPriceX96(
        uint160 currentSqrtPriceX96,
        uint160 upperSqrtPriceX96,
        uint256 amount0,
        uint256 amount1
    ) external pure returns(uint256 lowerSqrtPriceX96) {
        return UniswapV3Utils.getLowerSqrtPriceX96(
            currentSqrtPriceX96,
            upperSqrtPriceX96,
            amount0,
            amount1
        );
    }

    function getValidTick(uint160 sqrtPriceX96, int24 tickSpacing) external pure returns(int24 validTick) {
        return UniswapV3Utils.getValidTick(sqrtPriceX96, tickSpacing);
    }

    function getValidTick(int24 tick, int24 tickSpacing) external pure returns(int24 validTick) {
        return UniswapV3Utils.getValidTick(tick, tickSpacing);
    }

    function getSqrtPriceX96(uint256 balance0, uint256 balance1) external pure returns(uint160 sqrtPriceX96) {
        return UniswapV3Utils.getSqrtPriceX96(balance0, balance1);
    }

    function getAccumulatedFees(
        address positionManager, 
        address pool, 
        uint256 tokenId
    ) external view returns(uint256 amount0, uint256 amount1) {
        return UniswapV3Utils.getAccumulatedFees(positionManager, pool, tokenId);
    }

    function getPositionLiquidity(
        address positionManager, 
        address pool, 
        uint256 tokenId
    ) external view returns(uint256 amount0, uint256 amount1) {
        return UniswapV3Utils.getPositionLiquidity(positionManager, pool, tokenId);
    }

    function getTickAtSqrtRatio(uint160 sqrtPriceX96) external pure returns(int24 tick) {
        return sqrtPriceX96.getTickAtSqrtRatio();
    }

    function getSqrtRatioAtTick(int24 tick) external pure returns(uint160 sqrtPriceX96) {
        return tick.getSqrtRatioAtTick();
    }

}