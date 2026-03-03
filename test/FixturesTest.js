const { UniswapV3DeploymentFixture, createUniswapV3DeploymentFixtureCustomWETH } = require("./UniswapV3DeploymentFixture");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { withDecimals } = require("./Utils");
const { expect } = require("chai");

if (require('../hardhat.config.js').networks.hardhat.forking.enabled) {
    return;
}

describe("FixturesTest", function () {
    it("Default fixture", async function () {
        const { weth, tokenDescriptor, positionManager, swapRouter01, swapRouter02, quoter01, quoter02 } = await loadFixture(UniswapV3DeploymentFixture);

        expect(await tokenDescriptor.WETH9()).to.equal(weth.target);
        expect(await positionManager.WETH9()).to.equal(weth.target);
        expect(await swapRouter01.WETH9()).to.equal(weth.target);
        expect(await swapRouter02.WETH9()).to.equal(weth.target);
        expect(await quoter01.WETH9()).to.equal(weth.target);
        expect(await quoter02.WETH9()).to.equal(weth.target);

        expect(await weth.name()).to.equal("Wrapped Ether");
        expect(await weth.symbol()).to.equal("WETH");
        expect(await weth.decimals()).to.equal(18n);
        expect(await weth.totalSupply()).to.equal(0n);
    });

    it("Custom WETH fixture", async function () {
        const [user] = await ethers.getSigners();

        const WETH9 = new ethers.ContractFactory(require('../build/WETH9.json').abi, require('../build/WETH9.json').bytecode, user);
        const wethPreDeploy = await WETH9.deploy();
        await wethPreDeploy.waitForDeployment();

        await wethPreDeploy.connect(user).deposit({ value: withDecimals("9000") });

        const UniswapV3DeploymentFixtureCustomWETH = createUniswapV3DeploymentFixtureCustomWETH(wethPreDeploy);
        const { weth, tokenDescriptor, positionManager, swapRouter01, swapRouter02, quoter01, quoter02 } = await loadFixture(UniswapV3DeploymentFixtureCustomWETH);

        expect(wethPreDeploy).to.equal(weth);
        expect(wethPreDeploy.target).to.equal(weth.target);

        expect(await tokenDescriptor.WETH9()).to.equal(weth.target);
        expect(await positionManager.WETH9()).to.equal(weth.target);
        expect(await swapRouter01.WETH9()).to.equal(weth.target);
        expect(await swapRouter02.WETH9()).to.equal(weth.target);
        expect(await quoter01.WETH9()).to.equal(weth.target);
        expect(await quoter02.WETH9()).to.equal(weth.target);

        expect(await weth.name()).to.equal("Wrapped Ether");
        expect(await weth.symbol()).to.equal("WETH");
        expect(await weth.decimals()).to.equal(18n);
        expect(await weth.totalSupply()).to.equal(withDecimals("9000"));
    });
});