const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { zeroAddress } = require("./Utils");

async function UniswapV3DeploymentFixture() {
    const [, , , , , , , , , , , , , , , , , , , uniswapV3Deployer] = await ethers.getSigners();

    const WETH = await ethers.getContractFactory("WETH", uniswapV3Deployer);
    const weth = await WETH.deploy();
    await weth.waitForDeployment();

    const UniswapV3DeploymentFixtureCustomWETH = createUniswapV3DeploymentFixtureCustomWETH(weth);

    return await loadFixture(UniswapV3DeploymentFixtureCustomWETH);
}

function createUniswapV3DeploymentFixtureCustomWETH(weth) {
    async function UniswapV3DeploymentFixtureCustomWETH() {
        const [, , , , , , , , , , , , , , , , , , , uniswapV3Deployer] = await ethers.getSigners();

        const nativeCurrencyLabel = "0x4554480000000000000000000000000000000000000000000000000000000000";

        const UniswapV3Factory = new ethers.ContractFactory(
            require('@uniswap/v3-core-0.7/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi,
            require('@uniswap/v3-core-0.7/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').bytecode,
            uniswapV3Deployer
        );
        const uniswapFactory = await UniswapV3Factory.deploy();
        await uniswapFactory.waitForDeployment();

        await uniswapFactory.connect(uniswapV3Deployer).enableFeeAmount(100, 1);

        const NFTDescriptor = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json').bytecode,
            uniswapV3Deployer
        );
        const NFTDescriptorLibrary = await NFTDescriptor.deploy();
        await NFTDescriptorLibrary.waitForDeployment();

        const NonfungibleTokenPositionDescriptor = new ethers.ContractFactory(
            require(
                '@uniswap/v3-periphery-0.7/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'
            ).abi,
            require(
                '@uniswap/v3-periphery-0.7/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'
            ).bytecode.replace("__$cea9be979eee3d87fb124d6cbb244bb0b5$__", NFTDescriptorLibrary.target.slice(2)),
            uniswapV3Deployer
        );
        const tokenDescriptor = await NonfungibleTokenPositionDescriptor.deploy(weth.target, nativeCurrencyLabel);
        await tokenDescriptor.waitForDeployment();

        const NonfungiblePositionManager = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').bytecode,
            uniswapV3Deployer
        );
        const positionManager = await NonfungiblePositionManager.deploy(uniswapFactory.target, weth.target, tokenDescriptor.target);
        await positionManager.waitForDeployment();

        const SwapRouter01 = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/SwapRouter.sol/SwapRouter.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/SwapRouter.sol/SwapRouter.json').bytecode,
            uniswapV3Deployer
        );
        const swapRouter01 = await SwapRouter01.deploy(uniswapFactory.target, weth.target);
        await swapRouter01.waitForDeployment();

        const SwapRouter02 = new ethers.ContractFactory(
            require('@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json').abi,
            require('@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json').bytecode,
            uniswapV3Deployer
        );
        const swapRouter02 = await SwapRouter02.deploy(zeroAddress, uniswapFactory.target, positionManager.target, weth.target);
        await swapRouter02.waitForDeployment();

        const QuoterV1 = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/Quoter.sol/Quoter.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/Quoter.sol/Quoter.json').bytecode,
            uniswapV3Deployer
        );
        const quoter01 = await QuoterV1.deploy(uniswapFactory.target, weth.target);
        await quoter01.waitForDeployment();

        const QuoterV2 = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json').bytecode,
            uniswapV3Deployer
        );
        const quoter02 = await QuoterV2.deploy(uniswapFactory.target, weth.target);
        await quoter02.waitForDeployment();

        const TickLens = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/TickLens.sol/TickLens.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/TickLens.sol/TickLens.json').bytecode,
            uniswapV3Deployer
        );
        const tickLens = await TickLens.deploy();
        await tickLens.waitForDeployment();

        const UniswapInterfaceMulticall = new ethers.ContractFactory(
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json').abi,
            require('@uniswap/v3-periphery-0.7/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json').bytecode,
            uniswapV3Deployer
        );
        const interfaceMulticall = await UniswapInterfaceMulticall.deploy();
        await interfaceMulticall.waitForDeployment();

        return {
            uniswapV3Deployer, weth, uniswapFactory, tokenDescriptor, positionManager, swapRouter01, swapRouter02, quoter01, quoter02, tickLens, interfaceMulticall
        };
    }

    return UniswapV3DeploymentFixtureCustomWETH;
}

module.exports = { UniswapV3DeploymentFixture, createUniswapV3DeploymentFixtureCustomWETH };