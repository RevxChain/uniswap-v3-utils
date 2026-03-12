const { loadFixture, mine } = require("@nomicfoundation/hardhat-network-helpers");

const uniswapV3PoolBytecode = require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').bytecode;
const uniswapV3PoolAbi = require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').abi;

async function UniswapV3DeploymentFixture() {
    const [, , , , , , , , , , , , , , , , , , , uniswapV3Deployer] = await ethers.getSigners();

    const WETH9 = new ethers.ContractFactory(
        require('../build/gnosis/canonical-weth/WETH9.json').abi,
        require('../build/gnosis/canonical-weth/WETH9.json').bytecode,
        uniswapV3Deployer
    );
    const weth = await WETH9.deploy();
    await weth.waitForDeployment();

    const UniswapV3DeploymentFixtureCustomWETH = createUniswapV3DeploymentFixtureCustomWETH(weth.target);

    return await loadFixture(UniswapV3DeploymentFixtureCustomWETH);
}

function createUniswapV3DeploymentFixtureCustomWETH(wethAddress) {
    async function UniswapV3DeploymentFixtureCustomWETH() {
        const [, , , , , , , , , , , , , , , , , , , uniswapV3Deployer] = await ethers.getSigners();

        const nativeCurrencyLabel = "0x4554480000000000000000000000000000000000000000000000000000000000";

        const UniswapV3Factory = new ethers.ContractFactory(
            require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi,
            require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').bytecode,
            uniswapV3Deployer
        );
        const uniswapFactory = await UniswapV3Factory.deploy();
        await uniswapFactory.waitForDeployment();

        await uniswapFactory.connect(uniswapV3Deployer).enableFeeAmount(100, 1);

        const NFTDescriptor = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json').bytecode,
            uniswapV3Deployer
        );
        const descriptorLibrary = await NFTDescriptor.deploy();
        await descriptorLibrary.waitForDeployment();

        const NonfungibleTokenPositionDescriptor = new ethers.ContractFactory(
            require(
                '../build/@uniswap/v3-periphery-0.7/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'
            ).abi,
            require(
                '../build/@uniswap/v3-periphery-0.7/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'
            ).bytecode.replace("__$cea9be979eee3d87fb124d6cbb244bb0b5$__", descriptorLibrary.target.slice(2)),
            uniswapV3Deployer
        );
        const tokenDescriptor = await NonfungibleTokenPositionDescriptor.deploy(wethAddress, nativeCurrencyLabel);
        await tokenDescriptor.waitForDeployment();

        const NonfungiblePositionManager = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').bytecode,
            uniswapV3Deployer
        );
        const nonfungiblePositionManager = await NonfungiblePositionManager.deploy(uniswapFactory.target, wethAddress, tokenDescriptor.target);
        await nonfungiblePositionManager.waitForDeployment();

        const SwapRouter01 = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/SwapRouter.sol/SwapRouter.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/SwapRouter.sol/SwapRouter.json').bytecode,
            uniswapV3Deployer
        );
        const swapRouter01 = await SwapRouter01.deploy(uniswapFactory.target, wethAddress);
        await swapRouter01.waitForDeployment();

        const SwapRouter02 = new ethers.ContractFactory(
            require('../build/@uniswap/swap-router-contracts/contracts/SwapRouter02.sol/SwapRouter02.json').abi,
            require('../build/@uniswap/swap-router-contracts/contracts/SwapRouter02.sol/SwapRouter02.json').bytecode,
            uniswapV3Deployer
        );
        const swapRouter02 = await SwapRouter02.deploy(ethers.ZeroAddress, uniswapFactory.target, nonfungiblePositionManager.target, wethAddress);
        await swapRouter02.waitForDeployment();

        const QuoterV1 = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/Quoter.sol/Quoter.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/Quoter.sol/Quoter.json').bytecode,
            uniswapV3Deployer
        );
        const quoter01 = await QuoterV1.deploy(uniswapFactory.target, wethAddress);
        await quoter01.waitForDeployment();

        const QuoterV2 = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/QuoterV2.sol/QuoterV2.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/QuoterV2.sol/QuoterV2.json').bytecode,
            uniswapV3Deployer
        );
        const quoter02 = await QuoterV2.deploy(uniswapFactory.target, wethAddress);
        await quoter02.waitForDeployment();

        const TickLens = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/TickLens.sol/TickLens.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/TickLens.sol/TickLens.json').bytecode,
            uniswapV3Deployer
        );
        const tickLens = await TickLens.deploy();
        await tickLens.waitForDeployment();

        const UniswapInterfaceMulticall = new ethers.ContractFactory(
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json').abi,
            require('../build/@uniswap/v3-periphery-0.7/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json').bytecode,
            uniswapV3Deployer
        );
        const multicall = await UniswapInterfaceMulticall.deploy();
        await multicall.waitForDeployment();

        const Multicall2 = new ethers.ContractFactory(
            require('../build/sky-ecosystem/multicall/Multicall2.json').abi,
            require('../build/sky-ecosystem/multicall/Multicall2.json').bytecode,
            uniswapV3Deployer
        );
        const multicall2 = await Multicall2.deploy();
        await multicall2.waitForDeployment();

        const Permit2 = new ethers.ContractFactory(
            require('../build/@uniswap/permit2/Permit2.json').abi,
            require('../build/@uniswap/permit2/Permit2.json').bytecode,
            uniswapV3Deployer
        );
        const permit2 = await Permit2.deploy();
        await permit2.waitForDeployment();

        const UniversalRouter = new ethers.ContractFactory(
            require('../build/@uniswap/universal-router/contracts/UniversalRouter.sol/UniversalRouter.json').abi,
            require('../build/@uniswap/universal-router/contracts/UniversalRouter.sol/UniversalRouter.json').bytecode,
            uniswapV3Deployer
        );
        const universalRouter = await UniversalRouter.deploy([
            permit2.target,
            wethAddress,
            ethers.ZeroAddress,
            uniswapFactory.target,
            ethers.ZeroHash,
            ethers.solidityPackedKeccak256(["bytes"], [uniswapV3PoolBytecode]),
            ethers.ZeroAddress,
            nonfungiblePositionManager.target,
            ethers.ZeroAddress,
            ethers.ZeroAddress
        ]);
        await universalRouter.waitForDeployment();

        const weth = await ethers.getContractAt(require('../build/gnosis/canonical-weth/WETH9.json').abi, wethAddress);

        return {
            uniswapV3Deployer, weth, uniswapFactory, descriptorLibrary, tokenDescriptor, nonfungiblePositionManager, swapRouter01, swapRouter02, quoter01, quoter02,
            tickLens, multicall, multicall2, permit2, universalRouter, uniswapV3PoolBytecode, uniswapV3PoolAbi
        };
    }

    return UniswapV3DeploymentFixtureCustomWETH;
}

async function UniswapV3MainnetForkSetup(chainId) {

    await mine(1);

    const addresses = require('../uniswap.addresses.json')[chainId.toString()];

    const weth = await ethers.getContractAt(require('../build/gnosis/canonical-weth/WETH9.json').abi, addresses.wethAddress);

    const uniswapFactory = await ethers.getContractAt(
        require('../build/@uniswap/v3-core-0.7/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi,
        addresses.uniswapFactoryAddress
    );

    const descriptorLibrary = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json').abi,
        addresses.descriptorLibraryAddress
    );

    const tokenDescriptor = await ethers.getContractAt(
        require(
            '../build/@uniswap/v3-periphery-0.7/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'
        ).abi,
        addresses.tokenDescriptorAddress
    );

    const nonfungiblePositionManager = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi,
        addresses.positionManagerAddress
    );

    const swapRouter01 = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/SwapRouter.sol/SwapRouter.json').abi,
        addresses.swapRouter01Address
    );

    const swapRouter02 = await ethers.getContractAt(
        require('../build/@uniswap/swap-router-contracts/contracts/SwapRouter02.sol/SwapRouter02.json').abi,
        addresses.swapRouter02Address
    );

    const quoter01 = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/lens/Quoter.sol/Quoter.json').abi,
        addresses.quoter01Address
    );

    const quoter02 = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/lens/QuoterV2.sol/QuoterV2.json').abi,
        addresses.quoter02Address
    );

    const tickLens = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/lens/TickLens.sol/TickLens.json').abi,
        addresses.tickLensAddress
    );

    const multicall = await ethers.getContractAt(
        require('../build/@uniswap/v3-periphery-0.7/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json').abi,
        addresses.multicallAddress
    );

    const multicall2 = await ethers.getContractAt(require('../build/sky-ecosystem/multicall/Multicall2.json').abi, addresses.multicall2Address);

    const permit2 = await ethers.getContractAt(require('../build/@uniswap/permit2/Permit2.json').abi, addresses.permit2Address);

    const universalRouter = await ethers.getContractAt(
        require('../build/@uniswap/universal-router/contracts/UniversalRouter.sol/UniversalRouter.json').abi,
        addresses.universalRouterAddress
    );

    return {
        weth, uniswapFactory, descriptorLibrary, tokenDescriptor, nonfungiblePositionManager, swapRouter01, swapRouter02, quoter01, quoter02,
        tickLens, multicall, multicall2, permit2, universalRouter, uniswapV3PoolBytecode, uniswapV3PoolAbi
    };
}

module.exports = { UniswapV3MainnetForkSetup, UniswapV3DeploymentFixture, createUniswapV3DeploymentFixtureCustomWETH };