const { withDecimals, zeroAddress, convert, getRandomValue, getRandomInt, time } = require("./Utils");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { UniswapV3UtilsFixture } = require("./UniswapV3UtilsFixture");
const config = require('../hardhat.config.js');
const { expect } = require("chai");

if (config.networks.hardhat.forking.enabled) {
    return;
}

const FUZZING_RUNS = config.fuzzing.runs;

describe("UniswapV3Utils", function () {
    describe("Deploy", function () {
        it("After deploy state", async function () {
            const { uniswapV3UtilsMock, weth } = await loadFixture(UniswapV3UtilsFixture);

            expect(uniswapV3UtilsMock.target).to.not.equal(zeroAddress);
            expect(await weth.name()).to.equal("Wrapped Ether");
            expect(await weth.symbol()).to.equal("WETH");
            expect(await weth.decimals()).to.equal(18n);
            expect(await weth.totalSupply()).to.equal(withDecimals("9600"));
        });
    });

    describe("getAmountOut() family functions", function () {
        it("Should revert with OLD", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdc, withDecimals("1"))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, weth, withDecimals("1"))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdt, withDecimals("1"))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, token, withDecimals("1"))).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdt, withDecimals("1"))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdc, withDecimals("1"))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, token, withDecimals("1"))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, weth, withDecimals("1"))).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdc, withDecimals("1"), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, weth, withDecimals("1"), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdt, withDecimals("1")), 60n, false).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, token, withDecimals("1"), 60n, false)).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdt, withDecimals("1"), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdc, withDecimals("1"), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, token, withDecimals("1"), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, weth, withDecimals("1"), 60n, false)).revertedWith("OLD");
        });

        it("Incorrect tokenIn", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, usdc, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, weth, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, usdt, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, token, withDecimals("1"))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, usdt, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, usdc, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, token, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, weth, withDecimals("1"))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, usdc, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, weth, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, usdt, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, token, withDecimals("1"))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, usdt, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, usdc, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, token, withDecimals("1"))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, weth, withDecimals("1"))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdc, withDecimals("1"), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, weth, withDecimals("1"), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdt, withDecimals("1"), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, token, withDecimals("1"), 60n, true)).to.equal(0n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdt, withDecimals("1"), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdc, withDecimals("1"), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, token, withDecimals("1"), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, weth, withDecimals("1"), 60n, true)).to.equal(0n);
        });

        it("Success", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, weth, withDecimals("1"))).to.closeTo(convert(66672n, 12n), convert(100n, 12n));
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, token, convert(1n, 12n))).to.closeTo(50000, 10n);
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1"))).to.closeTo(convert(3333n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, usdt, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, token, convert(100n, 12n))).to.closeTo(withDecimals("0.0015"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, usdt, convert(1n, 6n))).to.closeTo(convert(20n, 12n), convert(1n, 10n));
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, usdc, convert(3000n, 6n))).to.closeTo(withDecimals("0.9"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, usdc, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, weth, withDecimals("1"))).to.closeTo(convert(66672n, 12n), convert(100n, 12n));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, token, convert(1n, 12n))).to.closeTo(50000, 10n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, weth, withDecimals("1"))).to.closeTo(convert(3333n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, usdt, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, token, convert(100n, 12n))).to.closeTo(withDecimals("0.0015"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, usdt, convert(1n, 6n))).to.closeTo(convert(20n, 12n), convert(1n, 10n));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, usdc, convert(3000n, 6n))).to.closeTo(withDecimals("0.9"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, usdc, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, weth, withDecimals("1"), 60n, true)).to.closeTo(convert(66672n, 12n), convert(100n, 12n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, token, convert(1n, 12n), 60n, true)).to.closeTo(50000, 10n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, weth, withDecimals("1"), 60n, true)).to.closeTo(convert(3333n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, usdt, convert(1n, 6n), 60n, true)).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, token, convert(100n, 12n), 60n, true)).to.closeTo(withDecimals("0.0015"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdt, convert(1n, 6n), 60n, true)).to.closeTo(convert(20n, 12n), convert(1n, 10n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdc, convert(3000n, 6n), 60n, true)).to.closeTo(withDecimals("0.9"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, usdc, convert(1n, 6n), 60n, true)).to.closeTo(convert(1n, 6n), 10n);
        });

        it("TWAP", async function () {
            const { swapRouter02, uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            await time.increase(3600);

            await usdc.connect(uniswapV3Deployer).approve(swapRouter02.target, await usdc.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).approve(positionManager.target, await usdc.balanceOf(uniswapV3Deployer.address));
            await weth.connect(uniswapV3Deployer).approve(positionManager.target, await weth.balanceOf(uniswapV3Deployer.address));

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(1200);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(1200);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(100);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(1200);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await positionManager.connect(uniswapV3Deployer).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                500n,
                -887270,
                887270,
                weth.target < usdc.target ? withDecimals("10") : convert(100000n, 6n),
                weth.target < usdc.target ? convert(100000n, 6n) : withDecimals("10"),
                0,
                0,
                uniswapV3Deployer.address,
                4102444800n
            ]);

            await time.increase(40);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(3636n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(4258n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(3808n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(4892n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(3988n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(5619n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(4177n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(6455n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(4375n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(7415n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(4581n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(8518n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(4799n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(9786n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(5025n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(11240n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(5512n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(6046n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(6632n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(7274n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(7979n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(8752n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(9600n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(10529n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(11549n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(12667n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(13447n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"))).to.closeTo(convert(13447n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));
        });

        if (!config.fuzzing.enabled) {
            return;
        }

        it("Fuzzing", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            const wethTokenRatio = await weth.balanceOf(wethTokenPool.target) / await token.balanceOf(wethTokenPool.target);
            const usdtUsdcRatio = await usdt.balanceOf(usdtUsdcPool.target) / await usdc.balanceOf(usdtUsdcPool.target);
            const tokenUsdtRatio = await token.balanceOf(tokenUsdtPool.target) / await usdt.balanceOf(tokenUsdtPool.target);
            const wethUsdcRatio = await weth.balanceOf(wethUsdcPool.target) / await usdc.balanceOf(wethUsdcPool.target);

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const randomValue = getRandomValue(2, 50);

                expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, weth, randomValue)).to.closeTo(randomValue / wethTokenRatio, (randomValue / wethTokenRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, token, randomValue)).to.closeTo(randomValue / tokenUsdtRatio, (randomValue / tokenUsdtRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, randomValue)).to.closeTo(randomValue / wethUsdcRatio, (randomValue / wethUsdcRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, usdt, randomValue)).to.closeTo(randomValue / usdtUsdcRatio, (randomValue / usdtUsdcRatio / 200n) + 1n);

                expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, token, randomValue)).to.closeTo(randomValue * wethTokenRatio, (randomValue * wethTokenRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, usdt, randomValue)).to.closeTo(randomValue * tokenUsdtRatio, (randomValue * tokenUsdtRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, usdc, randomValue)).to.closeTo(randomValue * wethUsdcRatio, (randomValue * wethUsdcRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, usdc, randomValue)).to.closeTo(randomValue * usdtUsdcRatio, (randomValue * usdtUsdcRatio / 200n) + 1n);

                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, weth, randomValue)).to.closeTo(randomValue / wethTokenRatio, (randomValue / wethTokenRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, token, randomValue)).to.closeTo(randomValue / tokenUsdtRatio, (randomValue / tokenUsdtRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, weth, randomValue)).to.closeTo(randomValue / wethUsdcRatio, (randomValue / wethUsdcRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, usdt, randomValue)).to.closeTo(randomValue / usdtUsdcRatio, (randomValue / usdtUsdcRatio / 200n) + 1n);

                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, token, randomValue)).to.closeTo(randomValue * wethTokenRatio, (randomValue * wethTokenRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, usdt, randomValue)).to.closeTo(randomValue * tokenUsdtRatio, (randomValue * tokenUsdtRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, usdc, randomValue)).to.closeTo(randomValue * wethUsdcRatio, (randomValue * wethUsdcRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, usdc, randomValue)).to.closeTo(randomValue * usdtUsdcRatio, (randomValue * usdtUsdcRatio / 200n) + 1n);

                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, weth, randomValue, 60n, true)).to.closeTo(randomValue / wethTokenRatio, (randomValue / wethTokenRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, token, randomValue, 60n, true)).to.closeTo(randomValue / tokenUsdtRatio, (randomValue / tokenUsdtRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, weth, randomValue, 60n, true)).to.closeTo(randomValue / wethUsdcRatio, (randomValue / wethUsdcRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, usdt, randomValue, 60n, true)).to.closeTo(randomValue / usdtUsdcRatio, (randomValue / usdtUsdcRatio / 200n) + 1n);

                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, token, randomValue, 60n, true)).to.closeTo(randomValue * wethTokenRatio, (randomValue * wethTokenRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdt, randomValue, 60n, true)).to.closeTo(randomValue * tokenUsdtRatio, (randomValue * tokenUsdtRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdc, randomValue, 60n, true)).to.closeTo(randomValue * wethUsdcRatio, (randomValue * wethUsdcRatio / 200n) + 1n);
                expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, usdc, randomValue, 60n, true)).to.closeTo(randomValue * usdtUsdcRatio, (randomValue * usdtUsdcRatio / 200n) + 1n);
            }
        });

        it("TWAP fuzzing price increase", async function () {
            const { swapRouter02, uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            await time.increase(3600);

            await usdc.connect(uniswapV3Deployer).approve(swapRouter02.target, await usdc.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).approve(positionManager.target, await usdc.balanceOf(uniswapV3Deployer.address));
            await weth.connect(uniswapV3Deployer).approve(positionManager.target, await weth.balanceOf(uniswapV3Deployer.address));

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(100);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                usdc.target,
                weth.target,
                500n,
                uniswapV3Deployer.address,
                convert(1000000n, 6n),
                0n,
                0n
            ]);

            await time.increase(10);

            await positionManager.connect(uniswapV3Deployer).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                500n,
                -887270,
                887270,
                weth.target < usdc.target ? withDecimals("10") : convert(100000n, 6n),
                weth.target < usdc.target ? convert(100000n, 6n) : withDecimals("10"),
                0,
                0,
                uniswapV3Deployer.address,
                4102444800n
            ]);

            await time.increase(40);

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const randomValue1 = getRandomInt(3900 + i * 10);
                const randomValue2 = getRandomInt(3900 + i * 10);

                const twap1 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), randomValue1, false);
                const twap2 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), randomValue2, false);

                expect(twap1).to.above(convert(3333n, 6n));
                expect(twap2).to.above(convert(3333n, 6n));

                expect(convert(13488n, 6n)).to.above(twap1);
                expect(convert(13488n, 6n)).to.above(twap2);

                if (randomValue2 > randomValue1) {
                    expect(twap1 + 1n).to.above(twap2);
                    expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1")) + 1n).to.above(twap1);
                } else if (randomValue2 < randomValue1) {
                    expect(twap2 + 1n).to.above(twap1);
                    expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1")) + 1n).to.above(twap2);
                } else {
                    expect(twap2).to.equal(twap1);
                    expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1")) + 1n).to.above(twap2);
                }

                await time.increase(10);
            }
        });

        it("TWAP fuzzing price decrease", async function () {
            const { swapRouter02, uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            await time.increase(3600);

            await weth.connect(uniswapV3Deployer).approve(swapRouter02.target, await weth.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).approve(positionManager.target, await usdc.balanceOf(uniswapV3Deployer.address));
            await weth.connect(uniswapV3Deployer).approve(positionManager.target, await weth.balanceOf(uniswapV3Deployer.address));

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(100);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(600);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("0.4"),
                0n,
                0n
            ]);

            await time.increase(10);

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                weth.target,
                usdc.target,
                500n,
                uniswapV3Deployer.address,
                withDecimals("100"),
                0n,
                0n
            ]);

            await time.increase(10);

            await positionManager.connect(uniswapV3Deployer).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                500n,
                -887270,
                887270,
                weth.target < usdc.target ? withDecimals("10") : convert(100000n, 6n),
                weth.target < usdc.target ? convert(100000n, 6n) : withDecimals("10"),
                0,
                0,
                uniswapV3Deployer.address,
                4102444800n
            ]);

            await time.increase(40);

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const randomValue1 = getRandomInt(3900 + i * 10);
                const randomValue2 = getRandomInt(3900 + i * 10);

                const twap1 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), randomValue1, false);
                const twap2 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, withDecimals("1"), randomValue2, false);

                expect(convert(3333n, 6n)).to.above(twap1);
                expect(convert(3333n, 6n)).to.above(twap2);

                expect(twap1).to.above(convert(1831n, 6n));
                expect(twap2).to.above(convert(1831n, 6n));

                if (randomValue2 < randomValue1) {
                    expect(twap1 + 1n).to.above(twap2);
                    expect(twap1 + 1n).to.above(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1")));
                } else if (randomValue2 > randomValue1) {
                    expect(twap2 + 1n).to.above(twap1);
                    expect(twap2 + 1n).to.above(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1")));
                } else {
                    expect(twap2).to.equal(twap1);
                    expect(twap2 + 1n).to.above(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, withDecimals("1")));
                }

                await time.increase(10);
            }
        });
    });
});