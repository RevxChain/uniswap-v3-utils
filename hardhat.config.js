require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require('dotenv').config();

const compilers = require("./solc.compilers.json");

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            allowUnlimitedContractSize: false,
            blockGasLimit: 16777216,
            forking: {
                url: process.env.FORK_RPC_URL !== undefined ? process.env.FORK_RPC_URL : "https://eth.llamarpc.com",
                blockNumber: process.env.FORK_BLOCK_NUMBER !== undefined ? process.env.FORK_BLOCK_NUMBER : 24540000,
                enabled: false
            }
        },
        eth: {
            url: process.env.ETH_RPC_URL !== undefined ? process.env.ETH_RPC_URL : "https://eth.llamarpc.com",
            chainId: 1,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        unichain: {
            url: process.env.UNICHAIN_RPC_URL !== undefined ? process.env.UNICHAIN_RPC_URL : "https://unichain.drpc.org",
            chainId: 130,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        arbitrum: {
            url: process.env.ARBITRUM_RPC_URL !== undefined ? process.env.ARBITRUM_RPC_URL : "https://arbitrum.llamarpc.com",
            chainId: 42161,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        optimism: {
            url: process.env.OPTIMISM_RPC_URL !== undefined ? process.env.OPTIMISM_RPC_URL : "https://optimism.llamarpc.com",
            chainId: 10,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        polygon: {
            url: process.env.POLYGON_RPC_URL !== undefined ? process.env.POLYGON_RPC_URL : "https://polygon.llamarpc.com",
            chainId: 137,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        base: {
            url: process.env.BASE_RPC_URL !== undefined ? process.env.BASE_RPC_URL : "https://base.llamarpc.com",
            chainId: 8453,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        bsc: {
            url: process.env.BSC_RPC_URL !== undefined ? process.env.BSC_RPC_URL : "https://binance.llamarpc.com",
            chainId: 56,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        avalanche: {
            url: process.env.AVALANCHE_RPC_URL !== undefined ? process.env.AVALANCHE_RPC_URL : "https://avalanche-c-chain-rpc.publicnode.com",
            chainId: 43114,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        celo: {
            url: process.env.CELO_RPC_URL !== undefined ? process.env.CELO_RPC_URL : "https://celo.drpc.org",
            chainId: 42220,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        blast: {
            url: process.env.BLAST_RPC_URL !== undefined ? process.env.BLAST_RPC_URL : "https://blast.drpc.org",
            chainId: 81457,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        zora: {
            url: process.env.ZORA_RPC_URL !== undefined ? process.env.ZORA_RPC_URL : "https://zora.drpc.org",
            chainId: 7777777,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        monad: {
            url: process.env.MONAD_RPC_URL !== undefined ? process.env.MONAD_RPC_URL : "https://monad-mainnet.drpc.org",
            chainId: 143,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        megaeth: {
            url: process.env.MEGAETH_RPC_URL !== undefined ? process.env.MEGAETH_RPC_URL : "https://megaeth.drpc.org",
            chainId: 4326,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        worldchain: {
            url: process.env.WORLDCHAIN_RPC_URL !== undefined ? process.env.WORLDCHAIN_RPC_URL : "https://worldchain.drpc.org",
            chainId: 480,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        xlayer: {
            url: process.env.XLAYER_RPC_URL !== undefined ? process.env.XLAYER_RPC_URL : "https://xlayer.drpc.org",
            chainId: 196,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        }
    },

    paths: {
        sources: "./src",
    },

    mocha: {
        timeout: 200000,
    },

    solidity: {
        compilers: [
            {
                version: "0.8.27",
                settings: {
                    viaIR: false,
                    evmVersion: "cancun",
                    optimizer: {
                        enabled: true,
                        runs: 1000,
                    },
                },
            },
        ],
        overrides: {
            "src/mocks/Multicall2.sol": compilers.multicall2,
            "src/mocks/Permit2.sol": compilers.permit2,
            "lib/permit2/src/Permit2.sol": compilers.permit2,
            "lib/permit2/src/AllowanceTransfer.sol": compilers.permit2,
            "lib/permit2/src/SignatureTransfer.sol": compilers.permit2,
            "lib/permit2/src/EIP712.sol": compilers.permit2,
            "lib/permit2/src/PermitErrors.sol": compilers.permit2,
        },
    },

    // custom fuzzing
    fuzzing: {
        enabled: true,
        runs: 100
    },

    gasReporter: {
        enabled: false,
    },

    contractSizer: {
        alphaSort: false,
        disambiguatePaths: false,
        runOnCompile: false,
        strict: false,
        only: [],
    }
}