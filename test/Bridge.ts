import { ethers, getSigners } from "hardhat";
import assert from "assert";
import {
  Bridge,
  Bridge__factory,
  IERC20Upgradeable,
  IERC20Upgradeable__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
} from "../typechain-types";
import { Event } from "ethers";

describe("Bridge", () => {
  const [owner] = getSigners(1);
  let uniswapRouter: IUniswapV2Router02;
  let bridge: Bridge;
  let oraiContract: IERC20Upgradeable;
  const destination = "0x8754032Ac7966A909e2E753308dF56bb08DabD69";
  const oraiAddr = "0x4c11249814f11b9346808179cf06e71ac328c1b5";
  const routerAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const wethAddr = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const bridgeContract = "0x09Beeedf51AA45718F46837C94712d89B157a9D3";
  const sendToCosmosEventHash = ethers.utils.solidityKeccak256(
    ["string"],
    ["SendToCosmosEvent(address,address,string,uint256,uint256)"]
  );

  beforeEach(async function () {
    bridge = await new Bridge__factory(owner).deploy(
      bridgeContract,
      routerAddr,
      wethAddr
    );
    uniswapRouter = IUniswapV2Router02__factory.connect(routerAddr, owner);
    oraiContract = IERC20Upgradeable__factory.connect(oraiAddr, owner);
  });

  it("retrieve returns contract addresses", async function () {
    // Store a value
    const contract = await bridge.gravityBridgeContract();
    const router = await bridge.swapRouter();
    const wrapped = await bridge.wrapNativeAddress();
    assert.strictEqual(contract, bridgeContract);
    assert.strictEqual(router, routerAddr);
    assert.strictEqual(wrapped, wethAddr);
  });

  it("bridgeFromETH swap eth to orai", async function () {
    const res = await bridge.bridgeFromETH(oraiAddr, "1", "", {
      value: "1",
    });
    const { events } = await res.wait();
    // use should have more than 0 orai
    const oraiBalance = await oraiContract.balanceOf(owner.getAddress());
    assert.equal(oraiBalance.gt("0"), true);

    const bridgeEvents = events?.filter((e) => e.address === bridgeContract);
    assert.equal(bridgeEvents?.length, 0);

    // should have no send to cosmos event
    assert.equal(
      events?.some((event) =>
        event.topics.some((topic) => topic === sendToCosmosEventHash)
      ),
      false
    );
  });

  it("bridgeFromETH swap eth to orai then send to cosmos", async function () {
    const res = await bridge.bridgeFromETH(oraiAddr, 1, destination, {
      value: "1000000000",
    });
    const { events } = await res.wait();
    const bridgeEvents = events?.filter((e) => e.address === bridgeContract);

    assert.equal(bridgeEvents?.length, 1);
    assert.equal(
      (bridgeEvents as Event[])[0].topics.some(
        (topic) => topic === sendToCosmosEventHash
      ),
      true
    );
  });

  it("bridgeFromERC20 swap eth to orai then swap orai to weth", async function () {
    const oraiAmount = 1000;
    const nativeEthAmount = "1000000000";
    await bridge.bridgeFromETH(oraiAddr, oraiAmount, "", {
      value: nativeEthAmount,
    });
    await oraiContract.approve(bridge.address, oraiAmount);
    const res = await bridge.bridgeFromERC20(
      oraiAddr,
      wethAddr,
      oraiAmount,
      1,
      ""
    );
    const { events } = await res.wait();
    console.log(events);
  });

  it("bridgeFromERC20 swap eth to orai then swap orai to weth then send to cosmos", async function () {
    const oraiAmount = 1000;
    const nativeEthAmount = "1000000000";
    await bridge.bridgeFromETH(oraiAddr, oraiAmount, "", {
      value: nativeEthAmount,
    });
    await oraiContract.approve(bridge.address, oraiAmount);
    const res = await bridge.bridgeFromERC20(
      oraiAddr,
      wethAddr,
      oraiAmount,
      1,
      destination
    );
    const { events } = await res.wait();
    console.log(events);
  });
});
