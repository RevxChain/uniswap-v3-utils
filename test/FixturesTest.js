const { UniswapV3MainnetForkSetup, UniswapV3DeploymentFixture, createUniswapV3DeploymentFixtureCustomWETH } = require("./UniswapV3DeploymentFixture");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { withDecimals, zeroAddress } = require("./Utils");
const { expect } = require("chai");

const forkingEnabled = require('../hardhat.config.js').networks.hardhat.forking.enabled;

describe("FixturesTest", function () {
    it("Mainnet fork setup [forking]", async function () {
        if (!forkingEnabled) return;

        const {
            weth, uniswapFactory, descriptorLibrary, tokenDescriptor, positionManager, swapRouter01, swapRouter02, quoter01, quoter02,
            tickLens, multicall, multicall2, permit2, universalRouter
        } = await UniswapV3MainnetForkSetup(1);

        const [, , , , , , , , , , , , , , , , , , , localSigner] = await ethers.getSigners();

        if (uniswapFactory.target != zeroAddress) expect(await uniswapFactory.owner()).to.not.equal(localSigner);
        if (descriptorLibrary.target != zeroAddress) expect(await ethers.provider.getCode(descriptorLibrary.target)).to.not.equal("0x");
        if (tokenDescriptor.target != zeroAddress) expect(await tokenDescriptor.WETH9()).to.equal(weth.target);
        if (positionManager.target != zeroAddress) expect(await positionManager.WETH9()).to.equal(weth.target);
        if (swapRouter01.target != zeroAddress) expect(await swapRouter01.WETH9()).to.equal(weth.target);
        if (swapRouter02.target != zeroAddress) expect(await swapRouter02.WETH9()).to.equal(weth.target);
        if (quoter01.target != zeroAddress) expect(await quoter01.WETH9()).to.equal(weth.target);
        if (quoter02.target != zeroAddress) expect(await quoter02.WETH9()).to.equal(weth.target);
        if (tickLens.target != zeroAddress) expect(await ethers.provider.getCode(tickLens.target)).to.not.equal("0x");
        if (multicall.target != zeroAddress) expect(await ethers.provider.getCode(multicall.target)).to.not.equal("0x");
        if (multicall2.target != zeroAddress) expect(await ethers.provider.getCode(multicall2.target)).to.not.equal("0x");
        if (permit2.target != zeroAddress) expect(await ethers.provider.getCode(permit2.target)).to.not.equal("0x");
        if (universalRouter.target != zeroAddress) expect(await universalRouter.V3_POSITION_MANAGER()).to.equal(positionManager.target);

        expect((await weth.name()).length).to.above(0n);
        expect((await weth.symbol()).length).to.above(0n);
        expect(await weth.decimals()).to.equal(18n);
        expect(await weth.totalSupply()).to.above(0n);
    });

    it("Default fixture [local]", async function () {
        if (forkingEnabled) return;

        const {
            weth, tokenDescriptor, positionManager, swapRouter01, swapRouter02, quoter01, quoter02, universalRouter
        } = await loadFixture(UniswapV3DeploymentFixture);

        expect(await tokenDescriptor.WETH9()).to.equal(weth.target);
        expect(await positionManager.WETH9()).to.equal(weth.target);
        expect(await swapRouter01.WETH9()).to.equal(weth.target);
        expect(await swapRouter02.WETH9()).to.equal(weth.target);
        expect(await quoter01.WETH9()).to.equal(weth.target);
        expect(await quoter02.WETH9()).to.equal(weth.target);
        expect(await universalRouter.V3_POSITION_MANAGER()).to.equal(positionManager.target);

        expect(await weth.name()).to.equal("Wrapped Ether");
        expect(await weth.symbol()).to.equal("WETH");
        expect(await weth.decimals()).to.equal(18n);
        expect(await weth.totalSupply()).to.equal(0n);
    });

    it("Custom WETH fixture [local]", async function () {
        if (forkingEnabled) return;

        const [user] = await ethers.getSigners();

        const WETH9 = new ethers.ContractFactory(
            require('../build/gnosis/canonical-weth/WETH9.json').abi,
            require('../build/gnosis/canonical-weth/WETH9.json').bytecode,
            user
        );
        const wethPreDeploy = await WETH9.deploy();
        await wethPreDeploy.waitForDeployment();

        await wethPreDeploy.connect(user).deposit({ value: withDecimals("9000") });

        const UniswapV3DeploymentFixtureCustomWETH = createUniswapV3DeploymentFixtureCustomWETH(wethPreDeploy.target);
        const {
            weth, tokenDescriptor, positionManager, swapRouter01, swapRouter02, quoter01, quoter02, universalRouter
        } = await loadFixture(UniswapV3DeploymentFixtureCustomWETH);

        expect(wethPreDeploy).to.equal(weth);
        expect(wethPreDeploy.target).to.equal(weth.target);

        expect(await tokenDescriptor.WETH9()).to.equal(weth.target);
        expect(await positionManager.WETH9()).to.equal(weth.target);
        expect(await swapRouter01.WETH9()).to.equal(weth.target);
        expect(await swapRouter02.WETH9()).to.equal(weth.target);
        expect(await quoter01.WETH9()).to.equal(weth.target);
        expect(await quoter02.WETH9()).to.equal(weth.target);
        expect(await universalRouter.V3_POSITION_MANAGER()).to.equal(positionManager.target);

        expect(await weth.name()).to.equal("Wrapped Ether");
        expect(await weth.symbol()).to.equal("WETH");
        expect(await weth.decimals()).to.equal(18n);
        expect(await weth.totalSupply()).to.equal(withDecimals("9000"));
    });
});