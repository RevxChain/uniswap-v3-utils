// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Tick} from "@uniswap/v3-core/contracts/libraries/Tick.sol";

/**
 * @title IUniswapV3PoolTyped
 * @notice Struct-typed interface for UniswapV3's pool.
 * @dev This interface normalizes the ABI to return a struct {Slot0} and {Tick.Info} instead of using a tuples.
 */
interface IUniswapV3PoolTyped {

    /**
     * @notice The current state information of the UniswapV3 pool.
     * @dev Struct packing the pool's mutable state from {slot0}:
     * - sqrtPriceX96: The current price.
     * - tick: The current tick.
     * - observationIndex: The most-recently updated index of the observations array.
     * - observationCardinality: The current maximum number of observations that are being stored.
     * - observationCardinalityNext: The next maximum number of observations to store, triggered in observations.write.
     * - feeProtocol: The current protocol fee as a percentage of the swap fee taken on withdrawal.
     * - unlocked: Whether the pool is locked.
     */
    struct Slot0 {
        uint160 sqrtPriceX96;
        int24   tick;
        uint16  observationIndex;
        uint16  observationCardinality;
        uint16  observationCardinalityNext;
        uint8   feeProtocol;
        bool    unlocked;
    }

    /**
     * @notice Returns the current pool state snapshot from {slot0}.
     * @dev Returns the complete {Slot0} struct containing current price, tick, and oracle state.
     * @return slot0Info The {Slot0} struct with current pool state.
     */
    function slot0() external view returns(Slot0 memory slot0Info);

    /**
     * @notice Returns the accumulated fee growth state for a specific tick.
     * @param tick The tick to query fee and liquidity state for.
     * @return tickInfo Returns the {Tick.Info} struct containing fee accounting and boundary data for the given {tick}:
     * - liquidityGross: The total position liquidity that references this tick.
     * - liquidityNet: Amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left).
     * - feeGrowthOutside0X128: Token0 fee growth per unit of liquidity on the other side of this tick (relative to the current tick).
     * - feeGrowthOutside1X128: Token1 fee growth per unit of liquidity on the other side of this tick (relative to the current tick).
     * - tickCumulativeOutside: The cumulative tick value on the other side of the tick.
     * - secondsPerLiquidityOutsideX128: The seconds per unit of liquidity on the other side of this tick (relative to the current tick).
     * - secondsOutside: The seconds spent on the other side of the tick (relative to the current tick).
     * - initialized: True if the tick is initialized.
     */
    function ticks(int24 tick) external view returns(Tick.Info memory tickInfo);

}