// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Tick} from "@uniswap/v3-core/contracts/libraries/Tick.sol";

interface IUniswapV3PoolTyped {

    struct Slot0 {
        uint160 sqrtPriceX96;
        int24   tick;
        uint16  observationIndex;
        uint16  observationCardinality;
        uint16  observationCardinalityNext;
        uint8   feeProtocol;
        bool    unlocked;
    }

    function slot0() external view returns(Slot0 memory slot0Info);

    function ticks(int24 tick) external view returns(Tick.Info memory tickInfo);

}