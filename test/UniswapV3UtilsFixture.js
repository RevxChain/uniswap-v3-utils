const { UniswapV3DeploymentFixture } = require("./UniswapV3DeploymentFixture");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { withDecimals, convert, createUniswapPool } = require("./Utils");
const { ethers } = require("hardhat");

async function UniswapV3UtilsFixture() {
    const [user, userOne, userTwo, userThree, userFour] = await ethers.getSigners();

    const {
        uniswapV3Deployer, weth, uniswapFactory, descriptorLibrary, tokenDescriptor, nonfungiblePositionManager, swapRouter01, 
        swapRouter02, quoter01, quoter02, tickLens, multicall, multicall2, permit2
    } = await loadFixture(UniswapV3DeploymentFixture);

    const stableDecimals = 6n;
    const tokenDecimals = 12n;
    const wethDecimals = await weth.decimals();

    const ERC20Token = await ethers.getContractFactory("ERC20Token", uniswapV3Deployer);
    const usdc = await ERC20Token.deploy(stableDecimals);
    await usdc.waitForDeployment();

    const usdt = await ERC20Token.deploy(stableDecimals);
    await usdt.waitForDeployment();

    const token = await ERC20Token.deploy(tokenDecimals);
    await token.waitForDeployment();

    const wethAmount = convert(300n, wethDecimals);

    await weth.connect(uniswapV3Deployer).deposit({ value: wethAmount * 2n });

    const wethTokenPool = await createUniswapPool(
        uniswapV3Deployer,
        uniswapFactory,
        nonfungiblePositionManager,
        weth,
        wethAmount,
        token,
        convert(20_000_000n, tokenDecimals),
        10000n
    );

    const tokenUsdtPool = await createUniswapPool(
        uniswapV3Deployer,
        uniswapFactory,
        nonfungiblePositionManager,
        token,
        convert(20_000_000n, tokenDecimals),
        usdt,
        convert(1_000_000n, stableDecimals),
        3000n
    );

    const wethUsdcPool = await createUniswapPool(
        uniswapV3Deployer,
        uniswapFactory,
        nonfungiblePositionManager,
        weth,
        wethAmount,
        usdc,
        convert(1_000_000n, stableDecimals),
        500n
    );

    const usdtUsdcPool = await createUniswapPool(
        uniswapV3Deployer,
        uniswapFactory,
        nonfungiblePositionManager,
        usdt,
        convert(1_000_000n, stableDecimals),
        usdc,
        convert(1_000_000n, stableDecimals),
        100n
    );

    await weth.connect(uniswapV3Deployer).deposit({ value: withDecimals("9000") });

    const UniswapV3UtilsMock = await ethers.getContractFactory("UniswapV3UtilsMock", uniswapV3Deployer);
    const uniswapV3UtilsMock = await UniswapV3UtilsMock.deploy();
    await uniswapV3UtilsMock.waitForDeployment();

    return {
        user, userOne, userTwo, userThree, userFour, uniswapV3Deployer, weth, uniswapFactory, descriptorLibrary, tokenDescriptor, nonfungiblePositionManager,
        swapRouter01, swapRouter02, quoter01, quoter02, tickLens, multicall, multicall2, permit2, usdc, usdt, token, wethTokenPool, tokenUsdtPool,
        wethUsdcPool, usdtUsdcPool, uniswapV3UtilsMock
    };
};

module.exports = { UniswapV3UtilsFixture };