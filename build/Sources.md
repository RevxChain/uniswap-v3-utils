# Sources

List of precompiled contracts stored as JSON files with ABI and bytecode to simplify dependency management during installing the package. These contracts are used only for local deployment as a testing environment.

---

| Code | Compilation | Source
|---|---|---|
| Multicall2 | compiled locally using `solc.compilers.json:multicall2` | [github/sky-ecosystem/multicall](https://github.com/sky-ecosystem/multicall/blob/master/src/Multicall2.sol)
| WETH9 | `json` file direct copy | [github/gnosis/canonical-weth](https://github.com/gnosis/canonical-weth/blob/0dd1ea3e295eef916d0c6223ec63141137d22d67/build/contracts/WETH9.json)
| @uniswap/v3-core-0.7 | `artifacts` folder direct copy | [npm/@uniswap/v3-core](https://www.npmjs.com/package/@uniswap/v3-core/v/1.0.1)
| @uniswap/v3-periphery-0.7 | `artifacts` folder direct copy | [npm/@uniswap/v3-periphery](https://www.npmjs.com/package/@uniswap/v3-periphery/v/1.4.4)
| @uniswap/swap-router-contracts |  `artifacts` folder direct copy | [npm/@uniswap/swap-router-contracts](https://www.npmjs.com/package/@uniswap/swap-router-contracts/v/1.3.1) (package deprecated)
| @uniswap/Permit2 | compiled locally using `solc.compilers.json:permit2` | [github/@uniswap/permit2](https://github.com/Uniswap/permit2/blob/main/src/Permit2.sol)
| @uniswap/universal-router | `artifacts` folder direct copy | [npm/@uniswap/universal-router](https://www.npmjs.com/package/@uniswap/universal-router/v/2.1.0)