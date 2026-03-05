const uniswapV3PoolBytecode = require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').bytecode;
const uniswapV3PoolAbi = require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').abi;

const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const AbiCoder = new ethers.AbiCoder();
const withDecimals = ethers.parseEther;
const zeroAddress = ethers.ZeroAddress;
const zeroHash = ethers.ZeroHash;

function convert(amount, decimals) {
    return amount * 10n ** decimals;
};

function getRandomInt(max) {
    return BigInt(Math.floor(Math.random() * max));
}

function getRandomInt3(max) {
    return BigInt(Math.floor(Math.random() * max) + 3);
}

function getRandomValue(min, max) {
    const minCeiled = Math.ceil(min ** 10);
    const maxFloored = Math.floor(Math.floor(Math.random() * max) ** 10);
    return BigInt(Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled));
}

function getSqrtPriceX96(token0, token1, token0Amount, token1Amount) {
    return token0.target < token1.target ?
        BigInt(Math.round(Math.sqrt(Number(token1Amount) / Number(token0Amount)) * 2 ** 96)) :
        BigInt(Math.round(Math.sqrt(Number(token0Amount) / Number(token1Amount)) * 2 ** 96));
};

async function createUniswapPool(
    operator,
    uniswapFactory,
    positionManager,
    tokenOne,
    amountOne,
    tokenTwo,
    amountTwo,
    poolFee
) {

    if (await uniswapFactory.getPool(tokenOne.target, tokenTwo.target, poolFee) == zeroAddress) {
        await uniswapFactory.connect(operator).createPool(tokenOne.target, tokenTwo.target, poolFee);
    }

    const deployedPool = await ethers.getContractAt(
        uniswapV3PoolAbi,
        await uniswapFactory.getPool(tokenOne.target, tokenTwo.target, poolFee)
    );

    const sqrtPrice = getSqrtPriceX96(tokenOne, tokenTwo, amountOne, amountTwo);

    await deployedPool.connect(operator).initialize(sqrtPrice);
    await deployedPool.connect(operator).increaseObservationCardinalityNext(200n);

    if (await tokenOne.allowance(operator.address, positionManager.target) < amountOne) {
        await tokenOne.connect(operator).approve(positionManager.target, amountOne);
    }

    if (await tokenTwo.allowance(operator.address, positionManager.target) < amountTwo) {
        await tokenTwo.connect(operator).approve(positionManager.target, amountTwo);
    }

    let tickLower;
    let tickUpper;

    if (poolFee == 100) {
        tickLower = -887272;
        tickUpper = 887272;
    }

    if (poolFee == 500) {
        tickLower = -887270;
        tickUpper = 887270;
    }

    if (poolFee == 3000) {
        tickLower = -887220;
        tickUpper = 887220;
    }

    if (poolFee == 10000) {
        tickLower = -887200;
        tickUpper = 887200;
    }

    await positionManager.connect(operator).mint([
        tokenOne.target < tokenTwo.target ? tokenOne.target : tokenTwo.target,
        tokenOne.target < tokenTwo.target ? tokenTwo.target : tokenOne.target,
        poolFee,
        tickLower,
        tickUpper,
        tokenOne.target < tokenTwo.target ? amountOne : amountTwo,
        tokenOne.target < tokenTwo.target ? amountTwo : amountOne,
        0,
        0,
        operator.address,
        4102444800n
    ]);

    return deployedPool;
};

module.exports = {
    getSqrtPriceX96, convert, getRandomValue, getRandomInt, getRandomInt3, createUniswapPool, anyValue, time, AbiCoder, withDecimals, zeroAddress, zeroHash,
    uniswapV3PoolBytecode, uniswapV3PoolAbi
};