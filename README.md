# UniswapV3 Utils

<div align="center">

A Solidity library with various utility functions for UniswapV3 interactions — spot price quotes, TWAP quotes, calculation of amounts for providing liquidity and existing position, sqrtPriceX96 calculations, valid tick and accumulated fee getters.

[![Ethereum](https://img.shields.io/badge/Ethereum-Compatible-blue?logo=ethereum)](https://ethereum.org)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue?logo=solidity)](https://soliditylang.org)
[![Uniswap V3](https://img.shields.io/badge/Uniswap-V3-ff007a?logo=uniswap)](https://docs.uniswap.org/contracts/v3/overview)
[![Hardhat](https://img.shields.io/badge/Hardhat-Toolkit-yellow?logo=hardhat)](https://hardhat.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/RevxChain/uniswap-v3-utils/.github%2Fworkflows%2Ftests.yml)](https://github.com/RevxChain/uniswap-v3-utils/actions)
[![NPM Version](https://img.shields.io/npm/v/%40revxchain%2Funiswap-v3-utils?color=green)](https://www.npmjs.com/package/@revxchain/uniswap-v3-utils)


</div>

---

## Table of Contents

- [Overview](#overview)
- [Main Features](#main-features)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Security Considerations](#security-considerations)
- [License](#license)
- [Contributing](#contributing)
- [Support](#support)

---

## Overview

`UniswapV3Utils` is a Solidity library that contains the most common operations needed when integrating with the [UniswapV3](https://docs.uniswap.org/contracts/v3/overview) protocol. It consolidates spot price quotes, TWAP quotes, calculation of amounts for providing liquidity and existing position, sqrtPriceX96 calculations, valid tick and accumulated fee getters into a single module. 

It also includes a [Hardhat Fixture](https://v2.hardhat.org/hardhat-runner/docs/guides/test-contracts#using-fixtures) for full local deployment of the UniswapV3 protocol and a fork setup for testing integration using a mainnet fork where UniswapV3 is deployed.

---

## Main Features

| Feature | Function |
|---|---|
| TWAP quote (default 15 min window) | `getTimeWeightedAmountOut(pool, tokenIn, amountIn)` |
| TWAP quote with spot-price fallback | `getForceTimeWeightedAmountOut(pool, tokenIn, amountIn)` |
| Full TWAP quote with custom window and force flag | `getTimeWeightedAmountOut(pool, tokenIn, amountIn, secondsAgo, force)` |
| Spot price quote | `getAmountOut(pool, tokenIn, amountIn)` |
| Upper `sqrtPriceX96` boundary for a position | `getUpperSqrtPriceX96(lowerSqrtPriceX96, currentSqrtPriceX96, amount0, amount1)` |
| Lower `sqrtPriceX96` boundary for a position | `getLowerSqrtPriceX96(currentSqrtPriceX96, upperSqrtPriceX96, amount0, amount1)` |
| Proportional token amounts for a position | `getProportionalAmounts(pool, amount0, amount1, tickLower, tickUpper)` |
| Nearest valid tick from `sqrtPriceX96` | `getValidTick(sqrtPriceX96, tickSpacing)` |
| Nearest valid tick from `tick` | `getValidTick(tick, tickSpacing)` |
| `sqrtPriceX96` from token amount ratio | `getSqrtPriceX96(amount0, amount1)` |
| Accumulated position fees | `getAccumulatedFees(positionManager, pool, tokenId)` |
| Principal token amounts in the existed position | `getPositionLiquidity(positionManager, pool, tokenId)` |

---

## Project Structure

```
uniswap-v3-utils/
├── src/
│   ├── UniswapV3Utils.sol                       # Main Solidity library
│   │
│   ├── interfaces/
│   │   ├── IUniswapV3PoolTyped.sol              # Struct-typed pool interface
│   │   └── INonfungiblePositionManagerTyped.sol # Struct-typed position manager interface
│   │
│   ├── libraries/
│   │   ├── uniswap-v3-periphery-0.8/            # LiquidityAmounts, OracleLibrary
│   │   └── sir-trading-core/                    # FullMath
│   │
│   └── mocks/
│       ├── ERC20Token.sol                       # Test ERC20 token
│       ├── Multicall2.sol                       # Mock Multicall2
│       └── Permit2.sol                          # Mock Permit2
│
├── test/
│   ├── UniswapV3DeploymentFixture.js            # Full UniswapV3 local deployment + mainnet fork setup
│   ├── UniswapV3UtilsFixture.js                 # Fixture for library test
│   ├── UniswapV3Utils.js                        # Main test suite
│   ├── FixturesTest.js                          # Fixture tests
│   └── Utils.js                                 # Test helpers
│
├── artifacts/                                   # Compiled contract artifacts
├── coverage/                                    # Code coverage reports
├── build/                                       # Pre-compiled artifacts (uniswap, weth, multicall2)
├── lib/                                         # Submodule dev dependencies
├── env.example                                  # Example of .env file
├── uniswap.addresses.json                       # Uniswap deployments per chain
├── hardhat.config.js                            # Hardhat configuration
├── solc.compilers.json                          # Per-contract compiler overrides
├── package.json                                 # Dependencies and package info
└── README.md                                    # This file
```

---

## Key Components

### [UniswapV3Utils.sol](https://github.com/RevxChain/uniswap-v3-utils/blob/main/src/UniswapV3Utils.sol)

The primary Solidity library. Relies on the following math libraries:

- `LiquidityAmounts` — converts liquidity ↔ token amounts using `sqrtPriceX96` boundaries from [@uniswap/v3-periphery](https://github.com/Uniswap/v3-periphery).
- `OracleLibrary` — computes `getQuoteAtTick` for TWAP-based price quotes from [@uniswap/v3-periphery](https://github.com/Uniswap/v3-periphery).
- `FullMath` — overflow-safe `mulDiv` supporting 512-bit intermediate products from [SIR-trading/core](https://github.com/SIR-trading/Core).
- `FixedPointMathLib` — `sqrt` from [solmate](https://github.com/transmissions11/solmate).
- `TickMath`  — UniswapV3 tick math from [@uniswap/v3-core](https://github.com/Uniswap/v3-core).

### [UniswapV3DeploymentFixture()](https://github.com/RevxChain/uniswap-v3-utils/blob/main/test/UniswapV3DeploymentFixture.js#L6)

Hardhat fixture that deploys the complete UniswapV3 protocol from pre-compiled artifacts stored in `build/`:

| Contract | Source |
|---|---|
| [WETH9](https://github.com/gnosis/canonical-weth) | `build/gnosis/canonical-weth/` |
| [UniswapV3Factory](https://www.npmjs.com/package/@uniswap/v3-core/v/1.0.1) | `build/@uniswap/v3-core-0.7/` |
| [NFTDescriptor](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [NonfungibleTokenPositionDescriptor](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [NonfungiblePositionManager](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [SwapRouter01](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [SwapRouter02](https://www.npmjs.com/package/@uniswap/swap-router-contracts/v/1.3.1) | `build/@uniswap/swap-router-contracts/` |
| [QuoterV1](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [QuoterV2](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [TickLens](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [UniswapInterfaceMulticall](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4) | `build/@uniswap/v3-periphery-0.7/` |
| [Multicall2](https://github.com/sky-ecosystem/multicall) | `build/sky-ecosystem/multicall/` |
| [Permit2](https://github.com/Uniswap/permit2) | `build/@uniswap/permit2/` |
| [UnivesalRouter](https://www.npmjs.com/package/@uniswap/universal-router/v/2.1.0) | `build/@uniswap/universal-router/` |

### [createUniswapV3DeploymentFixtureCustomWETH()](https://github.com/RevxChain/uniswap-v3-utils/blob/main/test/UniswapV3DeploymentFixture.js#L22)

Hardhat fixture creation function that deploys the complete UniswapV3 protocol from pre-compiled artifacts stored in `build/` with custom `WETH` contract.

### [UniswapV3MainnetForkSetup()](https://github.com/RevxChain/uniswap-v3-utils/blob/main/test/UniswapV3DeploymentFixture.js#L160)

The function uses [uniswap.addresses.json](https://github.com/RevxChain/uniswap-v3-utils/blob/main/uniswap.addresses.json) to attach to live deployments for mainnet fork testing.

#### [Supported networks](https://docs.uniswap.org/contracts/v3/reference/deployments/)

| Network | Chain ID |
|---|---|
| Ethereum | 1 |
| Unichain | 130 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Polygon | 137 |
| Base | 8453 |
| BSC | 56 |
| Avalanche | 43114 |
| Celo | 42220 |
| Blast | 81457 |
| Zora | 7777777 |
| Monad | 143 |
| MegaETH | 4326 |

> [!WARNING]
> For networks where Ether is not the native asset, the `WETH` contract is used regardless. In reality, depends on the network; this is the wrapped version of the native asset.

> [!WARNING]
> Each network has a unique set of deployed contracts. For example, some networks might lack `SwapRouter01` or one of the `Multicall` contracts. Must familiarize with the [deployments](https://github.com/RevxChain/uniswap-v3-utils/blob/main/uniswap.addresses.json) of the selected network before using it.

---

## Installation

### Repository

#### Step 1: Clone the repository

```bash
git clone https://github.com/RevxChain/uniswap-v3-utils.git
cd uniswap-v3-utils
```

#### Step 2: Install dependencies

```bash
npm install
```

```bash
git submodule update --init --recursive
```

#### Step 3: Create environment file (optional)

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# PRIVATE KEYS
PRIVATE_KEY = your_private_key_here

# MAINNET FORK TEST
FORK_RPC_URL = https://eth.llamarpc.com
FORK_BLOCK_NUMBER = 24540000

# RPC URLS
ETH_RPC_URL = https://eth.llamarpc.com

```

#### Step 4: Compile contracts

```bash
npx hardhat compile
```

Compiles all Solidity contracts and generates artifacts.

#### Step 5: Run tests

```bash
npx hardhat test
```

#### Step 6: Run coverage

```bash
npx hardhat coverage
```

#### Step 7: Run tests with custom fuzzing runs

Set fuzzing runs value in the `hardhat.config.js`:

```
fuzzing: {
    enabled: true,
    runs: 100
},
```

Run tests:

```bash
npx hardhat test
```

### Package

```bash
npm install @revxchain/uniswap-v3-utils
```

---

## Quick Start

### Solidity library:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {UniswapV3Utils} from "@revxchain/uniswap-v3-utils/src/UniswapV3Utils.sol";

contract MyContract {

    /// @notice Calculates the output amount for a token swap using the default TWAP observation window (15 minutes).
    function getTimeWeightedAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getTimeWeightedAmountOut(pool, tokenIn, amountIn);
    }

    /// @notice Calculates the output amount using TWAP with fallback to spot price if observation data unavailable.
    function getForceTimeWeightedAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getForceTimeWeightedAmountOut(pool, tokenIn, amountIn);
    }

    /// @notice Calculates the output amount for a token swap using a custom TWAP observation window with optional force fallback.
    function getTimeWeightedAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn, 
        uint32 secondsAgo,
        bool force
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getTimeWeightedAmountOut(pool, tokenIn, amountIn, secondsAgo, force);
    }

    /// @notice Calculates the output amount for a token swap at the current spot price.
    function getAmountOut(
        address pool, 
        address tokenIn, 
        uint256 amountIn
    ) external view returns(uint256 amountOut) {
        return UniswapV3Utils.getAmountOut(pool, tokenIn, amountIn);
    }

    /// @notice Calculates the upper price boundary (sqrtPriceX96) for a liquidity position.
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

    /// @notice Calculates the lower price boundary (sqrtPriceX96) for a liquidity position.
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

    /// @notice Calculates the proportional amounts of both tokens required to provide liquidity within a specified price range.
    function getProportionalAmounts(
        address pool,
        uint256 amount0,
        uint256 amount1,
        int24 tickLower,
        int24 tickUpper
    ) external view returns(uint256 amount0Required, uint256 amount1Required) {
        return UniswapV3Utils.getProportionalAmounts(
            pool,
            amount0,
            amount1,
            tickLower,
            tickUpper
        );
    }

    /// @notice Finds the nearest valid tick for a given square root price, aligned to the pool's tick spacing.
    function getValidTick(uint160 sqrtPriceX96, int24 tickSpacing) external pure returns(int24 validTick) {
        return UniswapV3Utils.getValidTick(sqrtPriceX96, tickSpacing);
    }

    /// @notice Finds the nearest valid tick aligned to the given tick spacing.
    function getValidTick(int24 tick, int24 tickSpacing) external pure returns(int24 validTick) {
        return UniswapV3Utils.getValidTick(tick, tickSpacing);
    }

    /// @notice Calculates the effective square root of price (in Q64.96 format) from the ratio of two token amounts.
    function getSqrtPriceX96(uint256 amount0, uint256 amount1) external pure returns(uint160 sqrtPriceX96) {
        return UniswapV3Utils.getSqrtPriceX96(amount0, amount1);
    }

    /// @notice Calculates the accumulated trading fees for a UniswapV3 liquidity position.
    function getAccumulatedFees(
        address positionManager, 
        address pool, 
        uint256 tokenId
    ) external view returns(uint256 amount0, uint256 amount1) {
        return UniswapV3Utils.getAccumulatedFees(positionManager, pool, tokenId);
    }

    /// @notice Calculates the principal token amounts (amount0 and amount1) represented by a position's liquidity.
    function getPositionLiquidity(
        address positionManager, 
        address pool, 
        uint256 tokenId
    ) external view returns(uint256 amount0, uint256 amount1) {
        return UniswapV3Utils.getPositionLiquidity(positionManager, pool, tokenId);
    }
}
```

### Hardhat test environment:

#### [UniswapV3DeploymentFixture()](https://github.com/RevxChain/uniswap-v3-utils/blob/main/test/UniswapV3DeploymentFixture.js#L6)

```js
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { UniswapV3DeploymentFixture } = require("@revxchain/uniswap-v3-utils/test/UniswapV3DeploymentFixture.js");

const {
    uniswapV3Deployer, weth, uniswapFactory, descriptorLibrary, tokenDescriptor, positionManager, 
    swapRouter01, swapRouter02, quoter01, quoter02, tickLens, multicall, multicall2, permit2, 
    universalRouter, uniswapV3PoolBytecode, uniswapV3PoolAbi
} = await loadFixture(UniswapV3DeploymentFixture);
```

#### [createUniswapV3DeploymentFixtureCustomWETH()](https://github.com/RevxChain/uniswap-v3-utils/blob/main/test/UniswapV3DeploymentFixture.js#L22)

```js
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { createUniswapV3DeploymentFixtureCustomWETH } = require("@revxchain/uniswap-v3-utils/test/UniswapV3DeploymentFixture.js");

// your custom WETH's address
const wethAddress = "0x..."; 

// call function with custom WETH's address
const UniswapV3DeploymentFixtureCustomWETH = createUniswapV3DeploymentFixtureCustomWETH(wethAddress);

// initialize fixture
const {
    uniswapV3Deployer, uniswapFactory, descriptorLibrary, tokenDescriptor, positionManager, 
    swapRouter01, swapRouter02, quoter01, quoter02, tickLens, multicall, multicall2, permit2, 
    universalRouter, uniswapV3PoolBytecode, uniswapV3PoolAbi
} = await loadFixture(UniswapV3DeploymentFixtureCustomWETH);
```

#### [UniswapV3MainnetForkSetup()](https://github.com/RevxChain/uniswap-v3-utils/blob/main/test/UniswapV3DeploymentFixture.js#L160)

```js
const { UniswapV3MainnetForkSetup } = require("@revxchain/uniswap-v3-utils/test/UniswapV3DeploymentFixture.js");

const targetChainId = 1;

const {
    weth, uniswapFactory, descriptorLibrary, tokenDescriptor, positionManager, 
    swapRouter01, swapRouter02, quoter01, quoter02, tickLens, multicall, multicall2, permit2, 
    universalRouter, uniswapV3PoolBytecode, uniswapV3PoolAbi
} = await UniswapV3MainnetForkSetup(targetChainId);
```
---

## Security Considerations

- **No input validation.** `UniswapV3Utils` does not verify the correctness of any input. Passing an address that is not a valid `UniswapV3Pool`, or a `tokenIn` that is not one of the pool's tokens, may result in silent zero returns rather than a revert. Always validate inputs externally.

- **TWAP manipulation resistance.** The default TWAP window (`DEFAULT_TWAP_AGE = 15 minutes`) provides protection against single-block sandwich attacks, but longer windows provide stronger guarantees. Always assess the time window relative to your protocol's risk tolerance.

- **Spot price susceptibility.** Functions that use the current tick (`getAmountOut`) or the `force` fallback path (`getForceTimeWeightedAmountOut`) are susceptible to price manipulation within the same block. Use with caution — never as the sole price oracle for financial decisions.

- **Fixed-point rounding and discrete tick logic.** All calculations use integer fixed-point arithmetic with `Q64.96` precision. In cases of very wide ranges, very narrow ranges, or extremely disproportionate token amounts, computed boundaries (`getUpperSqrtPriceX96`, `getLowerSqrtPriceX96`, `getProportionalAmounts`, `getSqrtPriceX96`) may differ significantly from a benchmark. Always verify remaining amounts (dust) after using this calculation for interaction. If your requirements allow for off-chain calculations, it's better to do it that way. This library is useful when full on-chain autonomy and minimal risk of functionality blocking are required.

- **Oracle observation history.** `getTimeWeightedAmountOut` (without `force`) will revert if the pool does not have sufficient historical observations for the requested `secondsAgo` window. This is an expected UniswapV3 behaviour — ensure adequate observation cardinality before relying on TWAP.

---

## License

MIT License

Permission is hereby granted to use, copy, modify, and distribute this software freely.

See [LICENSE](LICENSE) file for full terms.

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

---

## Support

- [**GitHub Issues**](https://github.com/RevxChain/uniswap-v3-utils/issues) - Report bugs