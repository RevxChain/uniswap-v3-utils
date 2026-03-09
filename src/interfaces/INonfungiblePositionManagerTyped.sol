// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title INonfungiblePositionManagerTyped
 * @notice Struct-typed interface for UniswapV3's NonfungiblePositionManager.
 * @dev This interface normalizes the ABI to return a struct {Position} instead of using a tuple.
 */
interface INonfungiblePositionManagerTyped {

    /**
     * @notice Complete state data for a single UniswapV3 liquidity position.
     * @dev Struct containing all immutable position parameters and mutable state:
     * - nonce: The nonce for permits.
     * - operator: The address that is approved for spending.
     * - token0: The address of the token0 for a specific pool.
     * - token1: The address of the token1 for a specific pool.
     * - fee: The fee associated with the pool.
     * - tickLower: The lower end of the tick range for the position.
     * - tickUpper: The higher end of the tick range for the position.
     * - liquidity: The liquidity of the position.
     * - feeGrowthInside0LastX128: The fee growth of token0 as of the last action on the individual position.
     * - feeGrowthInside1LastX128: The fee growth of token1 as of the last action on the individual position.
     * - tokensOwed0: The uncollected amount of token0 owed to the position as of the last computation.
     * - tokensOwed1: The uncollected amount of token1 owed to the position as of the last computation.
     */
    struct Position {
        uint96  nonce;
        address operator;
        address token0;
        address token1;
        uint24  fee;
        int24   tickLower;
        int24   tickUpper;
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }

    /**
     * @notice Retrieves the complete state data for a specific position NFT.
     * @dev Returns the full {Position} struct for the given {tokenId}.
     * @param tokenId The NFT token ID of the position to retrieve.
     * @return position The {Position} struct containing all position data.
     */
    function positions(uint256 tokenId) external view returns(Position memory position);
}