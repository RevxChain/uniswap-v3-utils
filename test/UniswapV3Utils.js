const { withDecimals, maxUint256, zeroAddress, deadline, convert, getRandomValue, getRandomInt, getRandomInt3, time, anyValue } = require("./Utils");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { UniswapV3UtilsFixture } = require("./UniswapV3UtilsFixture.js");
const config = require('../hardhat.config.js');
const { expect } = require("chai");

if (config.networks.hardhat.forking.enabled) {
    return;
}

const FUZZING_RUNS = config.fuzzing.enabled ? config.fuzzing.runs : 1;

describe("UniswapV3Utils", function () {
    describe("Deploy", function () {
        it("After deploy state", async function () {
            const { uniswapV3UtilsMock, weth } = await loadFixture(UniswapV3UtilsFixture);

            expect(uniswapV3UtilsMock.target).to.not.equal(zeroAddress);
            expect(await weth.name()).to.equal("Wrapped Ether");
            expect(await weth.symbol()).to.equal("WETH");
            expect(await weth.decimals()).to.equal(18n);
            expect(await weth.totalSupply()).to.equal(convert(9600n, 18n));
        });
    });

    describe("getUpperSqrtPriceX96()", function () {
        it("Success", async function () {
            const { uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, user, uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const currentSqrtPriceX96 = (await wethUsdcPool.slot0())[0];
            const tickSpacing = await wethUsdcPool.tickSpacing();

            let lowerSqrtPriceX96 = 3722720286502976576157203271376n;

            if (lowerSqrtPriceX96 >= currentSqrtPriceX96) {
                lowerSqrtPriceX96 = currentSqrtPriceX96 / 3n;
            }

            const wethAmount = convert(10n, 18n);
            const usdcAmount = convert(12500n, 6n);

            const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
            const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

            const upperSqrtPriceX96 = await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                lowerSqrtPriceX96,
                currentSqrtPriceX96,
                amount0,
                amount1
            );

            await weth.connect(uniswapV3Deployer).transfer(user.address, wethAmount);
            await usdc.connect(uniswapV3Deployer).mint(user.address, usdcAmount);

            await weth.connect(user).approve(positionManager.target, wethAmount);
            await usdc.connect(user).approve(positionManager.target, usdcAmount);

            const wethBalanceBefore = await weth.balanceOf(user.address);
            const usdcBalanceBefore = await usdc.balanceOf(user.address);
            const nextTokenId = await positionManager.totalSupply() + 1n;

            await expect(positionManager.connect(user).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                await wethUsdcPool.fee(),
                await uniswapV3UtilsMock["getValidTick(uint160,int24)"](lowerSqrtPriceX96, tickSpacing),
                await uniswapV3UtilsMock["getValidTick(uint160,int24)"](upperSqrtPriceX96, tickSpacing),
                amount0,
                amount1,
                0n,
                0n,
                user.address,
                deadline
            ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                nextTokenId,
                anyValue,
                anyValue,
                anyValue
            ).to.emit(weth, "Transfer").withArgs(
                user.address,
                wethUsdcPool.target,
                anyValue
            ).to.emit(usdc, "Transfer").withArgs(
                user.address,
                wethUsdcPool.target,
                anyValue
            );

            expect(wethBalanceBefore - await weth.balanceOf(user.address)).to.closeTo(wethAmount, wethAmount / 100n);
            expect(usdcBalanceBefore - await usdc.balanceOf(user.address)).to.closeTo(usdcAmount, usdcAmount / 100n);

            expect(await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                11043392497307288n,
                3867022363293169828n,
                44549572267591999127931454272638834844272427009n,
                64867375265824872231664134531204031220212039681n
            )).to.equal(3867022363293169828n);
        });

        it("Pure [fuzzing]", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const maxTick = Number(await uniswapV3UtilsMock.MAX_TICK());
            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();
            const maxSqrtRatio = await uniswapV3UtilsMock.MAX_SQRT_RATIO();

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const currentTick = getRandomInt(2) == 0n ? getRandomInt(maxTick) : -getRandomInt(maxTick);
                const currentSqrtPriceX96 = await uniswapV3UtilsMock.getSqrtRatioAtTick(currentTick);

                let lowerSqrtPriceX96 = getRandomInt(Number(currentSqrtPriceX96) - 1);
                if (minSqrtRatio > lowerSqrtPriceX96) lowerSqrtPriceX96 = minSqrtRatio;

                expect(currentSqrtPriceX96 + 1n).to.above(lowerSqrtPriceX96);
                expect(lowerSqrtPriceX96 + 1n).to.above(minSqrtRatio);

                const amount0 = getRandomInt(Number(convert(10000000n, 40n))) + 1n;
                const amount1 = getRandomInt(Number(convert(10000000n, 40n))) + 1n;

                const upperSqrtPriceX96 = await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                    lowerSqrtPriceX96,
                    currentSqrtPriceX96,
                    amount0,
                    amount1
                );

                expect(upperSqrtPriceX96 + 1n).to.above(currentSqrtPriceX96);
                expect(maxSqrtRatio).to.above(upperSqrtPriceX96);

                const amount0Narrow = getRandomInt(Number(convert(100000n, 6n))) + 1n;
                const amount1Narrow = getRandomInt(Number(convert(100000n, 6n))) + 1n;

                const upperSqrtPriceX96Narrow = await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                    lowerSqrtPriceX96,
                    currentSqrtPriceX96,
                    amount0Narrow,
                    amount1Narrow
                );

                expect(upperSqrtPriceX96Narrow + 1n).to.above(currentSqrtPriceX96);
                expect(maxSqrtRatio).to.above(upperSqrtPriceX96Narrow);
            }
        });

        it("Providing liquidity [fuzzing]", async function () {
            const {
                uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, swapRouter02, user, userTwo, userThree, userFour, uniswapV3UtilsMock
            } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userTwo).transfer(user.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(user.address, await weth.balanceOf(userThree.address));
            await weth.connect(userFour).transfer(user.address, await weth.balanceOf(userFour.address));

            await positionManager.connect(uniswapV3Deployer).decreaseLiquidity([
                3n,
                1722050807568877n,
                0n,
                0n,
                deadline
            ]);

            await weth.connect(uniswapV3Deployer).transfer(user.address, await weth.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).mint(user.address, maxUint256 - await usdc.totalSupply());

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const poolFee = await wethUsdcPool.fee();
            const tickSpacing = await wethUsdcPool.tickSpacing();
            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const swapIn = getRandomInt(2) == 0n;
                const amountToSwap = swapIn ?
                    getRandomInt(Number(convert(30000n, 6n))) + convert(500n, 6n) :
                    getRandomInt(Number(convert(10n, 18n))) + withDecimals("0.1");

                if (swapIn ? await usdc.balanceOf(user.address) > amountToSwap : await weth.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? usdc.target : weth.target,
                        swapIn ? weth.target : usdc.target,
                        poolFee,
                        user.address,
                        amountToSwap,
                        0n,
                        0n
                    ]);
                }

                const currentSqrtPriceX96 = (await wethUsdcPool.slot0())[0];
                const currentTick = await uniswapV3UtilsMock.getTickAtSqrtRatio(currentSqrtPriceX96);

                let lowerSqrtPriceX96 = getRandomInt(Number(currentSqrtPriceX96) - 1);
                if (minSqrtRatio > lowerSqrtPriceX96) lowerSqrtPriceX96 = minSqrtRatio;

                const wethAmount = getRandomInt(Number(convert(300n, 18n))) + 1000000n;
                const usdcAmount = getRandomInt(Number(convert(1000000n, 6n))) + 1000n;

                const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
                const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

                const upperSqrtPriceX96 = await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                    lowerSqrtPriceX96,
                    currentSqrtPriceX96,
                    amount0,
                    amount1
                );

                const tickLower = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](lowerSqrtPriceX96, tickSpacing);
                const tickUpper = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](upperSqrtPriceX96, tickSpacing);

                const wethBalanceBefore = await weth.balanceOf(user.address);
                const usdcBalanceBefore = await usdc.balanceOf(user.address);
                const nextTokenId = await positionManager.totalSupply() + 1n;

                await expect(positionManager.connect(user).mint([
                    weth.target < usdc.target ? weth.target : usdc.target,
                    weth.target < usdc.target ? usdc.target : weth.target,
                    poolFee,
                    tickLower - tickSpacing < await uniswapV3UtilsMock.MIN_TICK() ? tickLower : tickLower - tickSpacing,
                    tickUpper + tickSpacing > await uniswapV3UtilsMock.MAX_TICK() ? tickUpper : tickUpper + tickSpacing,
                    amount0,
                    amount1,
                    0n,
                    0n,
                    user.address,
                    deadline
                ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                    nextTokenId,
                    anyValue,
                    anyValue,
                    anyValue
                ).to.emit(weth, "Transfer").withArgs(
                    user.address,
                    wethUsdcPool.target,
                    anyValue
                ).to.emit(usdc, "Transfer").withArgs(
                    user.address,
                    wethUsdcPool.target,
                    anyValue
                );

                if (tickUpper - currentTick > 1000n && currentTick - tickLower > 1000n && 750000n > tickUpper && tickLower > -750000n) {
                    expect(wethBalanceBefore - await weth.balanceOf(user.address)).to.closeTo(wethAmount, wethAmount / 33n);
                    expect(usdcBalanceBefore - await usdc.balanceOf(user.address)).to.closeTo(usdcAmount, usdcAmount / 33n);
                }

                if (swapIn ? await weth.balanceOf(user.address) > amountToSwap : await usdc.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? weth.target : usdc.target,
                        swapIn ? usdc.target : weth.target,
                        poolFee,
                        user.address,
                        await uniswapV3UtilsMock.getAmountOut(
                            wethUsdcPool,
                            swapIn ? usdc.target : weth.target,
                            amountToSwap
                        ),
                        0n,
                        0n
                    ]);
                }
            }
        });

        it("Providing liquidity narrow range [fuzzing]", async function () {
            const {
                uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, swapRouter02, user, userTwo, userThree, userFour, uniswapV3UtilsMock
            } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userTwo).transfer(user.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(user.address, await weth.balanceOf(userThree.address));
            await weth.connect(userFour).transfer(user.address, await weth.balanceOf(userFour.address));

            await positionManager.connect(uniswapV3Deployer).decreaseLiquidity([
                3n,
                1722050807568877n,
                0n,
                0n,
                deadline
            ]);

            await weth.connect(uniswapV3Deployer).transfer(user.address, await weth.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).mint(user.address, maxUint256 - await usdc.totalSupply());

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const poolFee = await wethUsdcPool.fee();
            const tickSpacing = await wethUsdcPool.tickSpacing();
            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const swapIn = getRandomInt(2) == 0n;
                const amountToSwap = swapIn ?
                    getRandomInt(Number(convert(30000n, 6n))) + convert(500n, 6n) :
                    getRandomInt(Number(convert(10n, 18n))) + withDecimals("0.1");

                if (swapIn ? await usdc.balanceOf(user.address) > amountToSwap : await weth.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? usdc.target : weth.target,
                        swapIn ? weth.target : usdc.target,
                        poolFee,
                        user.address,
                        amountToSwap,
                        0n,
                        0n
                    ]);
                }

                const currentSqrtPriceX96 = (await wethUsdcPool.slot0())[0];
                const currentTick = await uniswapV3UtilsMock.getTickAtSqrtRatio(currentSqrtPriceX96);

                let lowerSqrtPriceX96 = getRandomInt(Number(currentSqrtPriceX96) - 1);
                if (minSqrtRatio > lowerSqrtPriceX96) lowerSqrtPriceX96 = minSqrtRatio;

                const wethAmount = getRandomInt(Number(convert(100000n, 12n))) + 1000000n;
                const usdcAmount = getRandomInt(Number(convert(100000n, 6n))) + 100n;

                const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
                const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

                const upperSqrtPriceX96 = await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                    lowerSqrtPriceX96,
                    currentSqrtPriceX96,
                    amount0,
                    amount1
                );

                const tickLower = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](lowerSqrtPriceX96, tickSpacing);
                const tickUpper = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](upperSqrtPriceX96, tickSpacing);

                const wethBalanceBefore = await weth.balanceOf(user.address);
                const usdcBalanceBefore = await usdc.balanceOf(user.address);
                const nextTokenId = await positionManager.totalSupply() + 1n;

                await expect(positionManager.connect(user).mint([
                    weth.target < usdc.target ? weth.target : usdc.target,
                    weth.target < usdc.target ? usdc.target : weth.target,
                    poolFee,
                    tickLower,
                    tickUpper,
                    amount0,
                    amount1,
                    0n,
                    0n,
                    user.address,
                    deadline
                ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                    nextTokenId,
                    anyValue,
                    anyValue,
                    anyValue
                ).to.emit(weth, "Transfer").withArgs(
                    user.address,
                    wethUsdcPool.target,
                    anyValue
                ).to.emit(usdc, "Transfer").withArgs(
                    user.address,
                    wethUsdcPool.target,
                    anyValue
                );

                if (tickUpper - currentTick > 600n && currentTick - tickLower > 600n && 600000n > tickUpper && tickLower > -600000n) {
                    expect(wethBalanceBefore - await weth.balanceOf(user.address)).to.closeTo(wethAmount, wethAmount / 33n);
                    expect(usdcBalanceBefore - await usdc.balanceOf(user.address)).to.closeTo(usdcAmount, usdcAmount / 33n);
                }

                if (swapIn ? await weth.balanceOf(user.address) > amountToSwap : await usdc.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? weth.target : usdc.target,
                        swapIn ? usdc.target : weth.target,
                        poolFee,
                        user.address,
                        await uniswapV3UtilsMock.getAmountOut(
                            wethUsdcPool,
                            swapIn ? usdc.target : weth.target,
                            amountToSwap
                        ),
                        0n,
                        0n
                    ]);
                }
            }
        });
    });

    describe("getLowerSqrtPriceX96()", function () {
        it("Success", async function () {
            const { uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, user, uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const currentSqrtPriceX96 = (await wethUsdcPool.slot0())[0];
            const tickSpacing = await wethUsdcPool.tickSpacing();

            let upperSqrtPriceX96 = 2195280434697541071699621943234603n;

            if (currentSqrtPriceX96 >= upperSqrtPriceX96) {
                upperSqrtPriceX96 = currentSqrtPriceX96 * 3n;
            }

            const wethAmount = convert(10n, 18n);
            const usdcAmount = convert(12500n, 6n);

            const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
            const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

            const lowerSqrtPriceX96 = await uniswapV3UtilsMock.getLowerSqrtPriceX96(
                currentSqrtPriceX96,
                upperSqrtPriceX96,
                amount0,
                amount1
            );

            await weth.connect(uniswapV3Deployer).transfer(user.address, wethAmount);
            await usdc.connect(uniswapV3Deployer).mint(user.address, usdcAmount);

            await weth.connect(user).approve(positionManager.target, wethAmount);
            await usdc.connect(user).approve(positionManager.target, usdcAmount);

            const wethBalanceBefore = await weth.balanceOf(user.address);
            const usdcBalanceBefore = await usdc.balanceOf(user.address);
            const nextTokenId = await positionManager.totalSupply() + 1n;

            await expect(positionManager.connect(user).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                await wethUsdcPool.fee(),
                await uniswapV3UtilsMock["getValidTick(uint160,int24)"](lowerSqrtPriceX96, tickSpacing),
                await uniswapV3UtilsMock["getValidTick(uint160,int24)"](upperSqrtPriceX96, tickSpacing),
                amount0,
                amount1,
                0n,
                0n,
                user.address,
                deadline
            ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                nextTokenId,
                anyValue,
                anyValue,
                anyValue
            ).to.emit(weth, "Transfer").withArgs(
                user.address,
                wethUsdcPool.target,
                anyValue
            ).to.emit(usdc, "Transfer").withArgs(
                user.address,
                wethUsdcPool.target,
                anyValue
            );

            expect(wethBalanceBefore - await weth.balanceOf(user.address)).to.closeTo(wethAmount, wethAmount / 200n);
            expect(usdcBalanceBefore - await usdc.balanceOf(user.address)).to.closeTo(usdcAmount, usdcAmount / 200n);
        });

        it("Pure [fuzzing]", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const maxTick = await uniswapV3UtilsMock.MAX_TICK();
            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();
            const maxSqrtRatio = await uniswapV3UtilsMock.MAX_SQRT_RATIO();

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const currentTick = getRandomInt(2) == 0n ? getRandomInt(Number(maxTick)) : -getRandomInt(Number(maxTick));
                const currentSqrtPriceX96 = await uniswapV3UtilsMock.getSqrtRatioAtTick(currentTick);

                let upperSqrtPriceX96 = await uniswapV3UtilsMock.getSqrtRatioAtTick(getRandomInt(Number(maxTick - currentTick)) + currentTick);
                if (upperSqrtPriceX96 > maxSqrtRatio) upperSqrtPriceX96 = maxSqrtRatio;

                expect(upperSqrtPriceX96 + 1n).to.above(currentSqrtPriceX96);
                expect(maxSqrtRatio + 1n).to.above(upperSqrtPriceX96);

                const amount0 = getRandomInt(Number(convert(10000000n, 40n))) + 1n;
                const amount1 = getRandomInt(Number(convert(10000000n, 40n))) + 1n;

                const lowerSqrtPriceX96 = await uniswapV3UtilsMock.getLowerSqrtPriceX96(
                    currentSqrtPriceX96,
                    upperSqrtPriceX96,
                    amount0,
                    amount1
                );

                expect(currentSqrtPriceX96 + 1n).to.above(lowerSqrtPriceX96);
                expect(lowerSqrtPriceX96 + 1n).to.above(minSqrtRatio);

                const amount0Narrow = getRandomInt(Number(convert(100000n, 6n))) + 1n;
                const amount1Narrow = getRandomInt(Number(convert(100000n, 6n))) + 1n;

                const lowerSqrtPriceX96Narrow = await uniswapV3UtilsMock.getLowerSqrtPriceX96(
                    currentSqrtPriceX96,
                    upperSqrtPriceX96,
                    amount0Narrow,
                    amount1Narrow
                );

                expect(currentSqrtPriceX96 + 1n).to.above(lowerSqrtPriceX96Narrow);
                expect(lowerSqrtPriceX96Narrow + 1n).to.above(minSqrtRatio);
            }
        });

        it("Pure edge case", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();

            const currentSqrtPriceX96 = 7505996965136404n;
            const upperSqrtPriceX96 = 46637780941850232n;
            const amount0 = 95662537924n;
            const amount1 = 83782876893n;

            const lowerSqrtPriceX96 = await uniswapV3UtilsMock.getLowerSqrtPriceX96(
                currentSqrtPriceX96,
                upperSqrtPriceX96,
                amount0,
                amount1
            );

            expect(currentSqrtPriceX96 + 1n).to.above(lowerSqrtPriceX96);
            expect(lowerSqrtPriceX96 + 1n).to.above(minSqrtRatio);
        });

        it("Providing liquidity [fuzzing]", async function () {
            const {
                uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, swapRouter02, user, uniswapV3UtilsMock, userTwo, userThree, userFour
            } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userTwo).transfer(user.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(user.address, await weth.balanceOf(userThree.address));
            await weth.connect(userFour).transfer(user.address, await weth.balanceOf(userFour.address));

            await positionManager.connect(uniswapV3Deployer).decreaseLiquidity([
                3n,
                1722050807568877n,
                0n,
                0n,
                deadline
            ])

            await weth.connect(uniswapV3Deployer).transfer(user.address, await weth.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).mint(user.address, maxUint256 - await usdc.totalSupply());

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const poolFee = await wethUsdcPool.fee();
            const tickSpacing = await wethUsdcPool.tickSpacing();
            const maxSqrtRatio = await uniswapV3UtilsMock.MAX_SQRT_RATIO();
            const maxTick = await uniswapV3UtilsMock.MAX_TICK();

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const swapIn = getRandomInt(2) == 0n;
                const amountToSwap = swapIn ?
                    getRandomInt(Number(convert(30000n, 6n))) + convert(5000n, 6n) :
                    getRandomInt(Number(convert(10n, 18n))) + convert(1n, 18n);

                if (swapIn ? await usdc.balanceOf(user.address) > amountToSwap : await weth.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? usdc.target : weth.target,
                        swapIn ? weth.target : usdc.target,
                        poolFee,
                        user.address,
                        amountToSwap,
                        0n,
                        0n
                    ]);
                }

                const currentSqrtPriceX96 = (await wethUsdcPool.slot0())[0];
                const currentTick = await uniswapV3UtilsMock.getTickAtSqrtRatio(currentSqrtPriceX96);

                let upperSqrtPriceX96 = await uniswapV3UtilsMock.getSqrtRatioAtTick(getRandomInt(Number(maxTick - currentTick)) + currentTick);
                if (upperSqrtPriceX96 > maxSqrtRatio) upperSqrtPriceX96 = maxSqrtRatio;

                const wethAmount = getRandomInt(Number(convert(300n, 18n))) + 1000000n;
                const usdcAmount = getRandomInt(Number(convert(1000000n, 6n))) + 1000n;

                const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
                const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

                const lowerSqrtPriceX96 = await uniswapV3UtilsMock.getLowerSqrtPriceX96(
                    currentSqrtPriceX96,
                    upperSqrtPriceX96,
                    amount0,
                    amount1
                );

                const tickLower = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](lowerSqrtPriceX96, tickSpacing);
                const tickUpper = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](upperSqrtPriceX96, tickSpacing);

                const wethBalanceBefore = await weth.balanceOf(user.address);
                const usdcBalanceBefore = await usdc.balanceOf(user.address);
                const nextTokenId = await positionManager.totalSupply() + 1n;

                await expect(positionManager.connect(user).mint([
                    weth.target < usdc.target ? weth.target : usdc.target,
                    weth.target < usdc.target ? usdc.target : weth.target,
                    poolFee,
                    tickLower,
                    tickUpper,
                    amount0,
                    amount1,
                    0n,
                    0n,
                    user.address,
                    deadline
                ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                    nextTokenId,
                    anyValue,
                    anyValue,
                    anyValue
                ).to.emit(weth, "Transfer").withArgs(
                    user.address,
                    wethUsdcPool.target,
                    anyValue
                ).to.emit(usdc, "Transfer").withArgs(
                    user.address,
                    wethUsdcPool.target,
                    anyValue
                );

                if (tickUpper - currentTick > 650n && currentTick - tickLower > 650n && 887000n > tickUpper && tickLower > -887000n) {
                    expect(wethBalanceBefore - await weth.balanceOf(user.address)).to.closeTo(wethAmount, wethAmount / 100n);
                    expect(usdcBalanceBefore - await usdc.balanceOf(user.address)).to.closeTo(usdcAmount, usdcAmount / 100n);
                }

                if (swapIn ? await weth.balanceOf(user.address) > amountToSwap : await usdc.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? weth.target : usdc.target,
                        swapIn ? usdc.target : weth.target,
                        poolFee,
                        user.address,
                        await uniswapV3UtilsMock.getAmountOut(
                            wethUsdcPool,
                            swapIn ? usdc.target : weth.target,
                            amountToSwap
                        ),
                        0n,
                        0n
                    ]);
                }
            }
        });

        it("Providing liquidity narrow range [fuzzing]", async function () {
            const {
                uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, swapRouter02, user, uniswapV3UtilsMock, userTwo, userThree, userFour
            } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userTwo).transfer(user.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(user.address, await weth.balanceOf(userThree.address));
            await weth.connect(userFour).transfer(user.address, await weth.balanceOf(userFour.address));

            await positionManager.connect(uniswapV3Deployer).decreaseLiquidity([
                3n,
                1722050807568877n,
                0n,
                0n,
                deadline
            ])

            await weth.connect(uniswapV3Deployer).transfer(user.address, await weth.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).mint(user.address, maxUint256 - await usdc.totalSupply());

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const poolFee = await wethUsdcPool.fee();
            const tickSpacing = await wethUsdcPool.tickSpacing();
            const maxSqrtRatio = await uniswapV3UtilsMock.MAX_SQRT_RATIO();
            const maxTick = await uniswapV3UtilsMock.MAX_TICK();

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const swapIn = getRandomInt(2) == 0n;
                const amountToSwap = swapIn ?
                    getRandomInt(Number(convert(30000n, 6n))) + convert(5000n, 6n) :
                    getRandomInt(Number(convert(10n, 18n))) + convert(1n, 18n);

                if (swapIn ? await usdc.balanceOf(user.address) > amountToSwap : await weth.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? usdc.target : weth.target,
                        swapIn ? weth.target : usdc.target,
                        poolFee,
                        user.address,
                        amountToSwap,
                        0n,
                        0n
                    ]);
                }

                const currentSqrtPriceX96 = (await wethUsdcPool.slot0())[0];
                const currentTick = await uniswapV3UtilsMock.getTickAtSqrtRatio(currentSqrtPriceX96);

                let upperSqrtPriceX96 = await uniswapV3UtilsMock.getSqrtRatioAtTick(getRandomInt(Number(maxTick - currentTick)) + currentTick);
                if (upperSqrtPriceX96 > maxSqrtRatio) upperSqrtPriceX96 = maxSqrtRatio;

                const wethAmount = getRandomInt(Number(convert(100000n, 6n))) + 100n;
                const usdcAmount = getRandomInt(Number(convert(100000n, 6n))) + 100n;

                const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
                const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

                const lowerSqrtPriceX96 = await uniswapV3UtilsMock.getLowerSqrtPriceX96(
                    currentSqrtPriceX96,
                    upperSqrtPriceX96,
                    amount0,
                    amount1
                );

                const tickLower = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](lowerSqrtPriceX96, tickSpacing);
                const tickUpper = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](upperSqrtPriceX96, tickSpacing);

                const wethBalanceBefore = await weth.balanceOf(user.address);
                const usdcBalanceBefore = await usdc.balanceOf(user.address);
                const nextTokenId = await positionManager.totalSupply() + 1n;

                await expect(positionManager.connect(user).mint([
                    weth.target < usdc.target ? weth.target : usdc.target,
                    weth.target < usdc.target ? usdc.target : weth.target,
                    poolFee,
                    tickLower,
                    tickUpper,
                    amount0,
                    amount1,
                    0n,
                    0n,
                    user.address,
                    deadline
                ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                    nextTokenId,
                    anyValue,
                    anyValue,
                    anyValue
                );

                if (tickUpper - currentTick > 650n && currentTick - tickLower > 650n && 887000n > tickUpper && tickLower > -887000n) {
                    expect(wethBalanceBefore - await weth.balanceOf(user.address)).to.closeTo(wethAmount, wethAmount / 100n);
                    expect(usdcBalanceBefore - await usdc.balanceOf(user.address)).to.closeTo(usdcAmount, usdcAmount / 100n);
                }

                if (swapIn ? await weth.balanceOf(user.address) > amountToSwap : await usdc.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? weth.target : usdc.target,
                        swapIn ? usdc.target : weth.target,
                        poolFee,
                        user.address,
                        await uniswapV3UtilsMock.getAmountOut(
                            wethUsdcPool,
                            swapIn ? usdc.target : weth.target,
                            amountToSwap
                        ),
                        0n,
                        0n
                    ]);
                }
            }
        });
    });

    describe("getProportionalAmounts()", function () {
        it("Success out of lower range", async function () {
            const { uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, user, uniswapV3UtilsMock, swapRouter02 } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const wethAmount = convert(2n, 18n);
            const usdcAmount = convert(1000n, 6n);

            const totalValueInSingle = (
                convert(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, wethAmount), 18n) +
                convert(usdcAmount, 18n)
            ) / (10n ** 18n);

            await weth.connect(uniswapV3Deployer).transfer(user.address, wethAmount);
            await usdc.connect(uniswapV3Deployer).transfer(user.address, usdcAmount);

            const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
            const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;
            const token0 = weth.target < usdc.target ? weth.target : usdc.target;
            const token1 = weth.target < usdc.target ? usdc.target : weth.target;

            const poolFee = await wethUsdcPool.fee();

            const tickLower = -550000n;
            const tickUpper = 100000n;

            const proportionalAmounts = await uniswapV3UtilsMock.getProportionalAmounts(
                wethUsdcPool,
                amount0,
                amount1,
                tickLower,
                tickUpper
            );

            if (proportionalAmounts[0] > amount0) {
                await swapRouter02.connect(user).exactInputSingle([
                    token1,
                    token0,
                    poolFee,
                    user.address,
                    amount1 - proportionalAmounts[1],
                    0n,
                    0n
                ]);
            } else {
                await swapRouter02.connect(user).exactInputSingle([
                    token0,
                    token1,
                    poolFee,
                    user.address,
                    amount0 - proportionalAmounts[0],
                    0n,
                    0n
                ]);
            }

            const wethBalanceBefore = await weth.balanceOf(user.address);
            const usdcBalanceBefore = await usdc.balanceOf(user.address);

            await expect(positionManager.connect(user).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                poolFee,
                tickLower,
                tickUpper,
                weth.target < usdc.target ? wethBalanceBefore : usdcBalanceBefore,
                weth.target < usdc.target ? usdcBalanceBefore : wethBalanceBefore,
                0n,
                0n,
                user.address,
                deadline
            ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                anyValue,
                anyValue,
                anyValue,
                anyValue
            );

            const totalValueInSingleRemainder = (
                convert(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth.target, await weth.balanceOf(user)), 12n) +
                convert(await usdc.balanceOf(user), 12n)
            ) / (10n ** 18n);

            expect(totalValueInSingle / 200n).to.above(totalValueInSingleRemainder);
        });

        it("Success out of upper range", async function () {
            const { uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, user, uniswapV3UtilsMock, swapRouter02 } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const wethAmount = convert(2n, 18n);
            const usdcAmount = convert(1000n, 6n);

            const totalValueInSingle = (
                convert(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, wethAmount), 18n) +
                convert(usdcAmount, 18n)
            ) / (10n ** 18n);

            await weth.connect(uniswapV3Deployer).transfer(user.address, wethAmount);
            await usdc.connect(uniswapV3Deployer).transfer(user.address, usdcAmount);

            const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
            const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;
            const token0 = weth.target < usdc.target ? weth.target : usdc.target;
            const token1 = weth.target < usdc.target ? usdc.target : weth.target;

            const poolFee = await wethUsdcPool.fee();

            const tickLower = 250000n;
            const tickUpper = 500000n;

            const proportionalAmounts = await uniswapV3UtilsMock.getProportionalAmounts(
                wethUsdcPool,
                amount0,
                amount1,
                tickLower,
                tickUpper
            );

            if (proportionalAmounts[0] > amount0) {
                await swapRouter02.connect(user).exactInputSingle([
                    token1,
                    token0,
                    poolFee,
                    user.address,
                    amount1 - proportionalAmounts[1],
                    0n,
                    0n
                ]);
            } else {
                await swapRouter02.connect(user).exactInputSingle([
                    token0,
                    token1,
                    poolFee,
                    user.address,
                    amount0 - proportionalAmounts[0],
                    0n,
                    0n
                ]);
            }

            const wethBalanceBefore = await weth.balanceOf(user.address);
            const usdcBalanceBefore = await usdc.balanceOf(user.address);

            await expect(positionManager.connect(user).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                poolFee,
                tickLower,
                tickUpper,
                weth.target < usdc.target ? wethBalanceBefore : usdcBalanceBefore,
                weth.target < usdc.target ? usdcBalanceBefore : wethBalanceBefore,
                0n,
                0n,
                user.address,
                deadline
            ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                anyValue,
                anyValue,
                anyValue,
                anyValue
            );

            const totalValueInSingleRemainder = (
                convert(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth.target, await weth.balanceOf(user)), 12n) +
                convert(await usdc.balanceOf(user), 12n)
            ) / (10n ** 18n);

            expect(totalValueInSingle / 200n).to.above(totalValueInSingleRemainder);
        });

        it("Pure [fuzzing]", async function () {
            const {
                swapRouter02, uniswapV3Deployer, wethTokenPool, tokenUsdtPool, usdtUsdcPool, wethUsdcPool, uniswapV3UtilsMock, weth, token
            } = await loadFixture(UniswapV3UtilsFixture);

            const maxTick = await uniswapV3UtilsMock.MAX_TICK();

            const pools = [wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool];

            await token.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await token.connect(uniswapV3Deployer).mint(uniswapV3Deployer, maxUint256 - await token.totalSupply());

            await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                token.target,
                weth.target,
                await wethTokenPool.fee(),
                uniswapV3Deployer.address,
                convert(1000000n, 18n),
                0n,
                0n
            ]);

            expect(0n).to.above((await wethTokenPool.slot0())[1]);

            for (let i = 0; pools.length > i; i++) {
                const pool = pools[i];
                const token0 = await pool.token0();

                for (let i = 0; FUZZING_RUNS > i; i++) {
                    const amount0 = getRandomInt(Number(convert(100000n, 18n))) + 1n;
                    const amount1 = getRandomInt(Number(convert(100000n, 18n))) + 1n;

                    const totalValueInSingle = (
                        convert(await uniswapV3UtilsMock.getAmountOut(pool, token0, amount0), 18n) +
                        convert(amount1, 18n)
                    ) / (10n ** 18n);

                    const tickLower = getRandomInt(2) == 0n ? getRandomInt(Number(maxTick)) : -getRandomInt(Number(maxTick));
                    const tickUpper = getRandomInt(Number(maxTick - tickLower)) + tickLower;

                    const proportionalAmounts = await uniswapV3UtilsMock.getProportionalAmounts(
                        pool,
                        amount0,
                        amount1,
                        tickLower,
                        tickUpper
                    );

                    const totalValueInSingleAfter = (
                        convert(await uniswapV3UtilsMock.getAmountOut(pool, token0, proportionalAmounts[0]), 18n) +
                        convert(proportionalAmounts[1], 18n)
                    ) / (10n ** 18n);

                    expect(totalValueInSingle).to.closeTo(totalValueInSingleAfter, totalValueInSingle / 1000n);

                    if (proportionalAmounts[0] > amount0) {
                        expect(amount1 + 1n).to.above(proportionalAmounts[1]);
                    } else {
                        expect(amount0 + 1n).to.above(proportionalAmounts[0]);
                    }
                }

                expect(await uniswapV3UtilsMock.getProportionalAmounts(
                    pool,
                    getRandomInt(Number(convert(100000n, 18n))) + 1n,
                    getRandomInt(Number(convert(100000n, 18n))) + 1n,
                    0n,
                    -10000n
                )).to.eql([0n, 0n]);
            }
        });

        it("Providing liquidity [fuzzing]", async function () {
            const {
                uniswapV3Deployer, usdc, wethUsdcPool, weth, positionManager, swapRouter02, user, userTwo, userThree, userFour, uniswapV3UtilsMock
            } = await loadFixture(UniswapV3UtilsFixture);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userTwo).transfer(user.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(user.address, await weth.balanceOf(userThree.address));
            await weth.connect(userFour).transfer(user.address, await weth.balanceOf(userFour.address));

            await weth.connect(uniswapV3Deployer).transfer(user.address, await weth.balanceOf(uniswapV3Deployer.address));
            await usdc.connect(uniswapV3Deployer).mint(user.address, maxUint256 - await usdc.totalSupply());

            await weth.connect(user).approve(positionManager.target, maxUint256);
            await usdc.connect(user).approve(positionManager.target, maxUint256);

            await weth.connect(user).approve(swapRouter02.target, maxUint256);
            await usdc.connect(user).approve(swapRouter02.target, maxUint256);

            const token0 = weth.target < usdc.target ? weth.target : usdc.target;
            const token1 = weth.target < usdc.target ? usdc.target : weth.target;
            const poolFee = await wethUsdcPool.fee();
            const tickSpacing = await wethUsdcPool.tickSpacing();
            const minTick = await uniswapV3UtilsMock.MIN_TICK();
            const maxTick = await uniswapV3UtilsMock.MAX_TICK();

            await positionManager.connect(user).mint([
                token0,
                token1,
                poolFee,
                await uniswapV3UtilsMock["getValidTick(int24,int24)"](minTick, tickSpacing),
                await uniswapV3UtilsMock["getValidTick(int24,int24)"](maxTick, tickSpacing),
                weth.target == token0 ? convert(900n, 18n) : convert(3000000n, 6n),
                weth.target == token0 ? convert(3000000n, 6n) : convert(900n, 18n),
                0n,
                0n,
                user.address,
                deadline
            ]);

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const swapIn = getRandomInt(2) == 0n;
                const amountToSwap = swapIn ?
                    getRandomInt(Number(convert(3000000n, 6n))) + convert(500n, 6n) :
                    getRandomInt(Number(convert(1000n, 18n))) + withDecimals("0.1");

                if (swapIn ? await usdc.balanceOf(user.address) > amountToSwap : await weth.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? usdc.target : weth.target,
                        swapIn ? weth.target : usdc.target,
                        poolFee,
                        user.address,
                        amountToSwap,
                        0n,
                        0n
                    ]);
                }

                const currentTick = (await wethUsdcPool.slot0())[1];

                const wethAmount = getRandomInt(Number(convert(10n, 18n))) + 1000n;
                const usdcAmount = getRandomInt(Number(convert(30000n, 6n))) + 1n;

                const unusedWethBalance = await weth.balanceOf(user.address) - wethAmount;
                const unusedUsdcBalance = await usdc.balanceOf(user.address) - usdcAmount;

                const totalValueInSingle = (
                    convert(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth.target, wethAmount), 12n) +
                    convert(usdcAmount, 12n)
                ) / (10n ** 18n);

                const amount0 = weth.target < usdc.target ? wethAmount : usdcAmount;
                const amount1 = weth.target < usdc.target ? usdcAmount : wethAmount;

                const tickLower = await uniswapV3UtilsMock["getValidTick(int24,int24)"](getRandomInt(Number(maxTick + currentTick)) - maxTick, tickSpacing);
                const tickUpper = await uniswapV3UtilsMock["getValidTick(int24,int24)"](getRandomInt(Number(maxTick - currentTick)) + currentTick, tickSpacing);

                const proportionalAmounts = await uniswapV3UtilsMock.getProportionalAmounts(
                    wethUsdcPool,
                    amount0,
                    amount1,
                    tickLower,
                    tickUpper
                );

                await swapRouter02.connect(user).exactInputSingle([
                    proportionalAmounts[0] > amount0 ? token1 : token0,
                    proportionalAmounts[0] > amount0 ? token0 : token1,
                    poolFee,
                    user.address,
                    proportionalAmounts[0] > amount0 ? amount1 - proportionalAmounts[1] : amount0 - proportionalAmounts[0],
                    0n,
                    0n
                ]);

                const wethBalanceBefore = await weth.balanceOf(user.address) - unusedWethBalance;
                const usdcBalanceBefore = await usdc.balanceOf(user.address) - unusedUsdcBalance;
                const nextTokenId = await positionManager.totalSupply() + 1n;

                await expect(positionManager.connect(user).mint([
                    token0,
                    token1,
                    poolFee,
                    tickLower,
                    tickUpper,
                    weth.target == token0 ? wethBalanceBefore : usdcBalanceBefore,
                    weth.target == token0 ? usdcBalanceBefore : wethBalanceBefore,
                    0n,
                    0n,
                    user.address,
                    deadline
                ])).to.emit(positionManager, "IncreaseLiquidity").withArgs(
                    nextTokenId,
                    anyValue,
                    anyValue,
                    anyValue
                );

                const wethBalanceAfter = await weth.balanceOf(user.address) - unusedWethBalance;
                const usdcBalanceAfter = await usdc.balanceOf(user.address) - unusedUsdcBalance;

                const totalValueInSingleRemainder = (
                    convert(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth.target, wethBalanceAfter), 12n) +
                    convert(usdcBalanceAfter, 12n)
                ) / (10n ** 18n);

                if (tickUpper - (await wethUsdcPool.slot0())[1] > 2500n && (await wethUsdcPool.slot0())[1] - tickLower > 2500n) {
                    expect(totalValueInSingle / 25n).to.above(totalValueInSingleRemainder);
                }

                if (swapIn ? await weth.balanceOf(user.address) > amountToSwap : await usdc.balanceOf(user.address) > amountToSwap) {
                    await swapRouter02.connect(user).exactInputSingle([
                        swapIn ? weth.target : usdc.target,
                        swapIn ? usdc.target : weth.target,
                        poolFee,
                        user.address,
                        await uniswapV3UtilsMock.getAmountOut(
                            wethUsdcPool,
                            swapIn ? usdc.target : weth.target,
                            amountToSwap
                        ),
                        0n,
                        0n
                    ]);
                }
            }
        });
    });

    describe("getValidTick()", function () {
        it("Boundaries", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const minTick = await uniswapV3UtilsMock.MIN_TICK();
            const maxTick = await uniswapV3UtilsMock.MAX_TICK();
            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();
            const maxSqrtRatio = await uniswapV3UtilsMock.MAX_SQRT_RATIO();
            const tickSpacing = [1n, 10n, 60n, 200n];

            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](maxTick + 100000n, tickSpacing[0])).to.equal(maxTick);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](maxSqrtRatio + 1000000000n, tickSpacing[0])).to.equal(maxTick - 1n);
            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](minTick - 100000n, tickSpacing[0])).to.equal(minTick);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](minSqrtRatio - 1000000000n, tickSpacing[0])).to.equal(minTick);

            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](maxTick + 100000n, tickSpacing[1])).to.equal(maxTick - 2n);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](maxSqrtRatio + 1000000000n, tickSpacing[1])).to.equal(maxTick - 2n);
            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](minTick - 100000n, tickSpacing[1])).to.equal(minTick + 2n);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](minSqrtRatio - 1000000000n, tickSpacing[1])).to.equal(minTick + 2n);

            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](maxTick + 100000n, tickSpacing[2])).to.equal(maxTick - 52n);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](maxSqrtRatio + 1000000000n, tickSpacing[2])).to.equal(maxTick - 52n);
            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](minTick - 100000n, tickSpacing[2])).to.equal(minTick + 52n);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](minSqrtRatio - 1000000000n, tickSpacing[2])).to.equal(minTick + 52n);

            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](maxTick + 100000n, tickSpacing[3])).to.equal(maxTick - 72n);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](maxSqrtRatio + 1000000000n, tickSpacing[3])).to.equal(maxTick - 72n);
            expect(await uniswapV3UtilsMock["getValidTick(int24,int24)"](minTick - 100000n, tickSpacing[3])).to.equal(minTick + 72n);
            expect(await uniswapV3UtilsMock["getValidTick(uint160,int24)"](minSqrtRatio - 1000000000n, tickSpacing[3])).to.equal(minTick + 72n);
        });

        it("Success [fuzzing]", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const minTick = await uniswapV3UtilsMock.MIN_TICK();
            const maxTick = await uniswapV3UtilsMock.MAX_TICK();
            const tickSpacing = [1n, 10n, 60n, 200n];

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const currentTick = getRandomInt(2) == 0n ? getRandomInt(Number(maxTick)) : -getRandomInt(Number(maxTick));
                const currentSqrtPriceX96 = await uniswapV3UtilsMock.getSqrtRatioAtTick(currentTick);

                for (let j = 0; tickSpacing.length > j; j++) {
                    const validTick = await uniswapV3UtilsMock["getValidTick(int24,int24)"](currentTick, tickSpacing[j]);
                    const validTickBySqrtPriceX96 = await uniswapV3UtilsMock["getValidTick(uint160,int24)"](currentSqrtPriceX96, tickSpacing[j]);

                    expect(validTick % tickSpacing[j]).to.equal(0n);
                    expect(validTickBySqrtPriceX96 % tickSpacing[j]).to.equal(0n);

                    expect(validTick + 1n).to.above(minTick);
                    expect(maxTick).to.above(validTick);
                    expect(validTickBySqrtPriceX96 + 1n).to.above(minTick);
                    expect(maxTick).to.above(validTickBySqrtPriceX96);

                    expect(currentTick + tickSpacing[j] + 1n).to.above(validTick);
                    expect(validTick).to.above(currentTick - tickSpacing[j] - 1n);
                    expect(currentTick + tickSpacing[j] + 1n).to.above(validTickBySqrtPriceX96);
                    expect(validTickBySqrtPriceX96).to.above(currentTick - tickSpacing[j] - 1n);
                }
            }
        });
    });

    describe("getSqrtPriceX96()", function () {
        it("Zero", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            expect(await uniswapV3UtilsMock.getSqrtPriceX96(convert(1n, 18n), 0n)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getSqrtPriceX96(0n, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getSqrtPriceX96(0n, 0n)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getSqrtPriceX96(1n, 1n)).to.above(0n);

            expect(await uniswapV3UtilsMock.getSqrtPriceX96(1n, maxUint256)).to.equal(await uniswapV3UtilsMock.MAX_SQRT_RATIO() - 1n);
            expect(await uniswapV3UtilsMock.getSqrtPriceX96(maxUint256, 1n)).to.equal(await uniswapV3UtilsMock.MIN_SQRT_RATIO());
        });

        it("Success [fuzzing]", async function () {
            const { uniswapV3UtilsMock } = await loadFixture(UniswapV3UtilsFixture);

            const minSqrtRatio = await uniswapV3UtilsMock.MIN_SQRT_RATIO();
            const maxSqrtRatio = await uniswapV3UtilsMock.MAX_SQRT_RATIO();

            function getSqrtPriceX96Pure(amount0, amount1) {
                let result = BigInt(Math.round(Math.sqrt(Number(amount1) / Number(amount0)) * 2 ** 96));

                if (result >= maxSqrtRatio) return maxSqrtRatio;
                if (minSqrtRatio > result) return minSqrtRatio;

                return result;
            }

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const amount0 = getRandomInt(2 ** 128) + 1n;
                const amount1 = getRandomInt(2 ** 128) + 1n;

                expect(
                    await uniswapV3UtilsMock.getTickAtSqrtRatio(await uniswapV3UtilsMock.getSqrtPriceX96(amount0, amount1))
                ).to.equal(
                    await uniswapV3UtilsMock.getTickAtSqrtRatio(getSqrtPriceX96Pure(amount0, amount1))
                );
            }
        });
    });

    describe("getAccumulatedFees() && getPositionLiquidity()", function () {
        it("Zero", async function () {
            const { uniswapV3UtilsMock, positionManager, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            expect(await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, wethTokenPool.target, 1n)).to.eql([0n, 0n]);
            expect(await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, tokenUsdtPool.target, 2n)).to.eql([0n, 0n]);
            expect(await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, wethUsdcPool.target, 3n)).to.eql([0n, 0n]);
            expect(await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, usdtUsdcPool.target, 4n)).to.eql([0n, 0n]);
        });

        it("Success", async function () {
            const {
                uniswapV3Deployer, uniswapV3UtilsMock, positionManager, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool, weth, usdc,
                usdt, token, swapRouter02
            } = await loadFixture(UniswapV3UtilsFixture);

            const pools = [wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool];

            await weth.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await usdc.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await token.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await usdt.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);

            for (let i = 0; pools.length > i; i++) {
                const pool = pools[i];
                const token0 = await pool.token0();
                const token1 = await pool.token1();
                const poolFee = await pool.fee();

                const feesBefore = await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, pool.target, i + 1);

                await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                    token0,
                    token1,
                    poolFee,
                    uniswapV3Deployer.address,
                    convert(10000n, 6n),
                    0n,
                    0n
                ]);

                const feesAfter = await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, pool.target, i + 1);

                expect(feesAfter[0]).to.closeTo(feesBefore[0] + convert(10000n, 6n) * poolFee / 1000000n, 1n);
                expect(feesAfter[1]).to.equal(feesBefore[1]);

                await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                    token1,
                    token0,
                    poolFee,
                    uniswapV3Deployer.address,
                    convert(10000n, 6n),
                    0n,
                    0n
                ]);

                const feesEnd = await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, pool.target, i + 1);

                expect(feesEnd[0]).to.equal(feesAfter[0]);
                expect(feesEnd[1]).to.closeTo(feesAfter[1] + convert(10000n, 6n) * poolFee / 1000000n, 1n);
            }
        });

        it("Success out of lower range", async function () {
            const {
                uniswapV3Deployer, uniswapV3UtilsMock, positionManager, wethUsdcPool, weth, usdc, usdt, token, swapRouter02, user,
                userTwo, userThree, userFour
            } = await loadFixture(UniswapV3UtilsFixture);

            await positionManager.connect(uniswapV3Deployer).decreaseLiquidity([
                3n,
                15591457268119895n,
                0n,
                0n,
                deadline
            ]);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(user).transfer(uniswapV3Deployer.address, await weth.balanceOf(user.address));
            await weth.connect(userTwo).transfer(uniswapV3Deployer.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(uniswapV3Deployer.address, await weth.balanceOf(userThree));
            await weth.connect(userFour).transfer(uniswapV3Deployer.address, await weth.balanceOf(userFour.address));

            await weth.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await usdc.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await token.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await usdt.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);

            await weth.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);
            await usdc.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);
            await token.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);
            await usdt.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);

            const tickSpacing = await wethUsdcPool.tickSpacing();

            const wethBalanceBefore = await weth.balanceOf(uniswapV3Deployer.address);
            const usdcBalanceBefore = await usdc.balanceOf(uniswapV3Deployer.address);

            const wethAmount = withDecimals("0.01");

            await positionManager.connect(uniswapV3Deployer).mint([
                weth.target < usdc.target ? weth.target : usdc.target,
                weth.target < usdc.target ? usdc.target : weth.target,
                await wethUsdcPool.fee(),
                await uniswapV3UtilsMock["getValidTick(int24,int24)"]((await wethUsdcPool.slot0())[1] - 100000n, tickSpacing),
                await uniswapV3UtilsMock["getValidTick(int24,int24)"](
                    await uniswapV3UtilsMock.getTickAtSqrtRatio(
                        await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                            await uniswapV3UtilsMock.getSqrtRatioAtTick((await wethUsdcPool.slot0())[1] - 100000n),
                            (await wethUsdcPool.slot0())[0],
                            weth.target < usdc.target ? wethAmount : convert(5000n, 6n),
                            weth.target < usdc.target ? convert(5000n, 6n) : wethAmount
                        )
                    ), tickSpacing
                ),
                weth.target < usdc.target ? wethAmount : convert(5000n, 6n),
                weth.target < usdc.target ? convert(5000n, 6n) : wethAmount,
                0n,
                0n,
                uniswapV3Deployer.address,
                deadline
            ]);

            let positionLiquidity = await uniswapV3UtilsMock.getPositionLiquidity(positionManager.target, wethUsdcPool.target, 5n);

            if (weth.target > usdc.target) {
                expect(positionLiquidity[0]).to.closeTo(usdcBalanceBefore - await usdc.balanceOf(uniswapV3Deployer.address), positionLiquidity[0] / 100n);
                expect(positionLiquidity[1]).to.closeTo(wethBalanceBefore - await weth.balanceOf(uniswapV3Deployer.address), positionLiquidity[1] / 100n);
            } else {
                expect(positionLiquidity[1]).to.closeTo(usdcBalanceBefore - await usdc.balanceOf(uniswapV3Deployer.address), positionLiquidity[1] / 100n);
                expect(positionLiquidity[0]).to.closeTo(wethBalanceBefore - await weth.balanceOf(uniswapV3Deployer.address), positionLiquidity[0] / 100n);
            }

            while ((await wethUsdcPool.slot0())[1] + 1000n > 95200n) {
                await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                    usdc.target,
                    weth.target,
                    await wethUsdcPool.fee(),
                    uniswapV3Deployer.address,
                    convert(150000n, 6n),
                    0n,
                    0n
                ]);
            }

            positionLiquidity = await uniswapV3UtilsMock.getPositionLiquidity(positionManager.target, wethUsdcPool.target, 5n);

            if (weth.target > usdc.target) {
                expect(positionLiquidity[0]).to.equal(4980093429n);
                expect(positionLiquidity[1]).to.equal(0n);
            } else {
                expect(positionLiquidity[1]).to.equal(4980093429n);
                expect(positionLiquidity[0]).to.equal(0n);
            }

            const feesAfter = await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, wethUsdcPool.target, 5n);

            if (weth.target > usdc.target) {
                expect(feesAfter[0]).to.equal(2474504n);
                expect(feesAfter[1]).to.equal(0n);
            } else {
                expect(feesAfter[1]).to.equal(2474504n);
                expect(feesAfter[0]).to.equal(0n);
            }
        });

        it("Success out of upper range", async function () {
            const {
                uniswapV3Deployer, uniswapV3UtilsMock, positionManager, wethTokenPool, weth, usdc, usdt, token, swapRouter02, user,
                userTwo, userThree, userFour
            } = await loadFixture(UniswapV3UtilsFixture);

            await positionManager.connect(uniswapV3Deployer).decreaseLiquidity([
                1n,
                (await positionManager.positions(1n))[7] - 100000n,
                0n,
                0n,
                deadline
            ]);

            await weth.connect(user).deposit({ value: convert(9000n, 18n) });
            await weth.connect(userTwo).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userThree).deposit({ value: convert(9900n, 18n) });
            await weth.connect(userFour).deposit({ value: convert(9900n, 18n) });
            await weth.connect(user).transfer(uniswapV3Deployer.address, await weth.balanceOf(user.address));
            await weth.connect(userTwo).transfer(uniswapV3Deployer.address, await weth.balanceOf(userTwo.address));
            await weth.connect(userThree).transfer(uniswapV3Deployer.address, await weth.balanceOf(userThree));
            await weth.connect(userFour).transfer(uniswapV3Deployer.address, await weth.balanceOf(userFour.address));

            await weth.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await usdc.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await token.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);
            await usdt.connect(uniswapV3Deployer).approve(swapRouter02.target, maxUint256);

            await weth.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);
            await usdc.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);
            await token.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);
            await usdt.connect(uniswapV3Deployer).approve(positionManager.target, maxUint256);

            const tickSpacing = await wethTokenPool.tickSpacing();

            const wethAmount = withDecimals("0.0000000000001");

            await positionManager.connect(uniswapV3Deployer).mint([
                weth.target < token.target ? weth.target : token.target,
                weth.target < token.target ? token.target : weth.target,
                await wethTokenPool.fee(),
                await uniswapV3UtilsMock["getValidTick(int24,int24)"]((await wethTokenPool.slot0())[1] - 100n, tickSpacing),
                await uniswapV3UtilsMock["getValidTick(int24,int24)"](
                    await uniswapV3UtilsMock.getTickAtSqrtRatio(
                        await uniswapV3UtilsMock.getUpperSqrtPriceX96(
                            await uniswapV3UtilsMock.getSqrtRatioAtTick((await wethTokenPool.slot0())[1] - 100n),
                            (await wethTokenPool.slot0())[0],
                            weth.target < token.target ? wethAmount : convert(500000000n, 18n),
                            weth.target < token.target ? convert(500000000n, 18n) : wethAmount
                        )
                    ), tickSpacing
                ),
                weth.target < token.target ? wethAmount : convert(500000000n, 18n),
                weth.target < token.target ? convert(500000000n, 18n) : wethAmount,
                0n,
                0n,
                uniswapV3Deployer.address,
                deadline
            ]);

            while ((await wethTokenPool.slot0())[1] - 1000n < 336200n) {
                await swapRouter02.connect(uniswapV3Deployer).exactInputSingle([
                    weth.target,
                    token.target,
                    await wethTokenPool.fee(),
                    uniswapV3Deployer.address,
                    convert(1n, 18n),
                    0n,
                    0n
                ]);
            }

            const positionLiquidity = await uniswapV3UtilsMock.getPositionLiquidity(positionManager.target, wethTokenPool.target, 5n);

            if (weth.target > token.target) {
                expect(positionLiquidity[0]).to.equal(0n);
                expect(positionLiquidity[1]).to.equal(126173746900874n);
            } else {
                expect(positionLiquidity[1]).to.equal(126173746900874n);
                expect(positionLiquidity[0]).to.equal(0n);
            }

            const feesAfter = await uniswapV3UtilsMock.getAccumulatedFees(positionManager.target, wethTokenPool.target, 5n);

            if (weth.target > token.target) {
                expect(feesAfter[0]).to.equal(0n);
                expect(feesAfter[1]).to.equal(1274482290921n);
            } else {
                expect(feesAfter[1]).to.equal(1274482290921n);
                expect(feesAfter[0]).to.equal(0n);
            }
        });
    });

    describe("getAmountOut() family functions", function () {
        it("Should revert with OLD", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdc, convert(1n, 18n))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, weth, convert(1n, 18n))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdt, convert(1n, 18n))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, token, convert(1n, 18n))).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdt, convert(1n, 18n))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdc, convert(1n, 18n))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, token, convert(1n, 18n))).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, weth, convert(1n, 18n))).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdc, convert(1n, 18n), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, weth, convert(1n, 18n), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdt, convert(1n, 18n)), 60n, false).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, token, convert(1n, 18n), 60n, false)).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdt, convert(1n, 18n), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdc, convert(1n, 18n), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, token, convert(1n, 18n), 60n, false)).revertedWith("OLD");
            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, weth, convert(1n, 18n), 60n, false)).revertedWith("OLD");

            await expect(uniswapV3UtilsMock.getTimeWeightedAmountOut(token, weth, convert(1n, 18n), 60n, false)).revertedWith("No reason");
        });

        it("Incorrect tokenIn", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, usdc, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, weth, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, usdt, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, token, convert(1n, 18n))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, usdt, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, usdc, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, token, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, weth, convert(1n, 18n))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, usdc, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, weth, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, usdt, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, token, convert(1n, 18n))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, usdt, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, usdc, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, token, convert(1n, 18n))).to.equal(0n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, weth, convert(1n, 18n))).to.equal(0n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdc, convert(1n, 18n), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, weth, convert(1n, 18n), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdt, convert(1n, 18n), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, token, convert(1n, 18n), 60n, true)).to.equal(0n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, usdt, convert(1n, 18n), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdc, convert(1n, 18n), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, token, convert(1n, 18n), 60n, true)).to.equal(0n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, weth, convert(1n, 18n), 60n, true)).to.equal(0n);
        });

        it("Success", async function () {
            const { uniswapV3UtilsMock, weth, usdc, usdt, token, wethTokenPool, tokenUsdtPool, wethUsdcPool, usdtUsdcPool } = await loadFixture(UniswapV3UtilsFixture);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, weth, convert(1n, 18n))).to.closeTo(convert(66672n, 12n), convert(100n, 12n));
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, token, convert(1n, 12n))).to.closeTo(50000, 10n);
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n))).to.closeTo(convert(3333n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, usdt, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getAmountOut(wethTokenPool, token, convert(100n, 12n))).to.closeTo(withDecimals("0.0015"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getAmountOut(tokenUsdtPool, usdt, convert(1n, 6n))).to.closeTo(convert(20n, 12n), convert(1n, 10n));
            expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, usdc, convert(3000n, 6n))).to.closeTo(withDecimals("0.9"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getAmountOut(usdtUsdcPool, usdc, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, weth, convert(1n, 18n))).to.closeTo(convert(66672n, 12n), convert(100n, 12n));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, token, convert(1n, 12n))).to.closeTo(50000, 10n);
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, weth, convert(1n, 18n))).to.closeTo(convert(3333n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, usdt, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethTokenPool, token, convert(100n, 12n))).to.closeTo(withDecimals("0.0015"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(tokenUsdtPool, usdt, convert(1n, 6n))).to.closeTo(convert(20n, 12n), convert(1n, 10n));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(wethUsdcPool, usdc, convert(3000n, 6n))).to.closeTo(withDecimals("0.9"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getForceTimeWeightedAmountOut(usdtUsdcPool, usdc, convert(1n, 6n))).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, weth, convert(1n, 18n), 60n, true)).to.closeTo(convert(66672n, 12n), convert(100n, 12n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, token, convert(1n, 12n), 60n, true)).to.closeTo(50000, 10n);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, weth, convert(1n, 18n), 60n, true)).to.closeTo(convert(3333n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, usdt, convert(1n, 6n), 60n, true)).to.closeTo(convert(1n, 6n), 10n);

            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethTokenPool, token, convert(100n, 12n), 60n, true)).to.closeTo(withDecimals("0.0015"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(tokenUsdtPool, usdt, convert(1n, 6n), 60n, true)).to.closeTo(convert(20n, 12n), convert(1n, 10n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool, usdc, convert(3000n, 6n), 60n, true)).to.closeTo(withDecimals("0.9"), withDecimals("0.0001"));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(usdtUsdcPool, usdc, convert(1n, 6n), 60n, true)).to.closeTo(convert(1n, 6n), 10n);
        });

        it("TWAP success", async function () {
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
                weth.target < usdc.target ? convert(10n, 18n) : convert(100000n, 6n),
                weth.target < usdc.target ? convert(100000n, 6n) : convert(10n, 18n),
                0,
                0,
                uniswapV3Deployer.address,
                deadline
            ]);

            await time.increase(40);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(3636n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(4258n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(3808n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(4892n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(3988n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(5619n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(4177n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(6455n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(4375n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(7415n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(4581n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(8518n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(4799n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(9786n, 6n), convert(1n, 6n));

            await time.increase(30);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(5025n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(11240n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(5512n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(6046n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(6632n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(7274n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(7979n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(8752n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(9600n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(10529n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(11549n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(12667n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(13447n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));

            await time.increase(60);
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n))).to.closeTo(convert(13447n, 6n), convert(1n, 6n));
            expect(await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), 5n * 60n, false)).to.closeTo(convert(13447n, 6n), convert(1n, 6n));
        });

        it("TWAP success [fuzzing]", async function () {
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

        it("TWAP price increase [fuzzing]", async function () {
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
                weth.target < usdc.target ? convert(10n, 18n) : convert(100000n, 6n),
                weth.target < usdc.target ? convert(100000n, 6n) : convert(10n, 18n),
                0,
                0,
                uniswapV3Deployer.address,
                deadline
            ]);

            await time.increase(40);

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const randomValue1 = getRandomInt3(3900 + i * 10);
                const randomValue2 = getRandomInt3(3900 + i * 10);

                const twap1 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), randomValue1, false);
                const twap2 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), randomValue2, false);

                expect(twap1).to.above(convert(3333n, 6n));
                expect(twap2).to.above(convert(3333n, 6n));

                expect(convert(13488n, 6n)).to.above(twap1);
                expect(convert(13488n, 6n)).to.above(twap2);

                if (randomValue2 > randomValue1) {
                    expect(twap1 + 1n).to.above(twap2);
                    expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n)) + 1n).to.above(twap1);
                } else if (randomValue2 < randomValue1) {
                    expect(twap2 + 1n).to.above(twap1);
                    expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n)) + 1n).to.above(twap2);
                } else {
                    expect(twap2).to.equal(twap1);
                    expect(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n)) + 1n).to.above(twap2);
                }

                await time.increase(10);
            }
        });

        it("TWAP price decrease [fuzzing]", async function () {
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
                convert(100n, 18n),
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
                weth.target < usdc.target ? convert(10n, 18n) : convert(100000n, 6n),
                weth.target < usdc.target ? convert(100000n, 6n) : convert(10n, 18n),
                0,
                0,
                uniswapV3Deployer.address,
                deadline
            ]);

            await time.increase(40);

            for (let i = 0; FUZZING_RUNS > i; i++) {
                const randomValue1 = getRandomInt3(3900 + i * 10);
                const randomValue2 = getRandomInt3(3900 + i * 10);

                const twap1 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), randomValue1, false);
                const twap2 = await uniswapV3UtilsMock.getTimeWeightedAmountOut(wethUsdcPool.target, weth.target, convert(1n, 18n), randomValue2, false);

                expect(convert(3333n, 6n)).to.above(twap1);
                expect(convert(3333n, 6n)).to.above(twap2);

                expect(twap1).to.above(convert(1831n, 6n));
                expect(twap2).to.above(convert(1831n, 6n));

                if (randomValue2 < randomValue1) {
                    expect(twap1 + 1n).to.above(twap2);
                    expect(twap1 + 1n).to.above(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n)));
                } else if (randomValue2 > randomValue1) {
                    expect(twap2 + 1n).to.above(twap1);
                    expect(twap2 + 1n).to.above(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n)));
                } else {
                    expect(twap2).to.equal(twap1);
                    expect(twap2 + 1n).to.above(await uniswapV3UtilsMock.getAmountOut(wethUsdcPool, weth, convert(1n, 18n)));
                }

                await time.increase(10);
            }
        });
    });
});