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

describe("Bridge", () => {
  const [owner] = getSigners(1);
  let ownerAddress: string;
  let uniswapRouter: IUniswapV2Router02;
  let bridge: Bridge;
  let oraiContract: IERC20Upgradeable;
  const destination = "0x8754032Ac7966A909e2E753308dF56bb08DabD69";
  const oraiAddr = "0x4c11249814f11b9346808179Cf06e71ac328c1b5";
  const routerAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const wethAddr = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const bridgeContract = "0x09Beeedf51AA45718F46837C94712d89B157a9D3";
  const gravityInterface = new ethers.utils.Interface([
    "event SendToCosmosEvent(address indexed _tokenContract, address indexed _sender, string _destination, uint256 _amount, uint256 _eventNonce)",
  ]);
  const approveInterface = new ethers.utils.Interface([
    "event Approval(address indexed owner, address indexed spender, uint256 value);",
  ]);
  const transferInterface = new ethers.utils.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ]);

  beforeEach(async function () {
    ownerAddress = await owner.getAddress();
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

    // use should have more than 0 orai
    const oraiBalance = await oraiContract.balanceOf(ownerAddress);
    assert.equal(oraiBalance.gt("0"), true);
    const { events } = await res.wait();

    // there should be no gravity contract event
    assert.equal(
      events?.some((e) => e.address === bridgeContract),
      false
    );

    const erc20Events = events?.filter((e) => e.address === oraiAddr)!;
    // length is 2 because the first call is transferFrom when calling uniswap
    // 2nd one is transfer back to the sender's wallet
    assert.equal(erc20Events.length, 2);

    const transferLog = transferInterface.decodeEventLog(
      "Transfer",
      erc20Events[1].data,
      erc20Events[1].topics
    );
    assert.equal(transferLog[0], bridge.address);
    assert.equal(transferLog[1], ownerAddress);
  });

  it("bridgeFromETH swap eth to orai then send to cosmos", async function () {
    const res = await bridge.bridgeFromETH(oraiAddr, 1, destination, {
      value: "1000000000",
    });
    const { events } = await res.wait();
    const bridgeEvent = events?.find((e) => e.address === bridgeContract)!;
    const eventLog = gravityInterface.decodeEventLog(
      "SendToCosmosEvent",
      bridgeEvent.data,
      bridgeEvent.topics
    );
    assert.strictEqual(destination, eventLog._destination);
    assert.strictEqual(bridge.address, eventLog._sender);

    const erc20Events = events?.filter((e) => e.address === oraiAddr)!;
    // length is 3 because the first call is the swap call
    // 2nd one is to approve for the gravity bridge contract to transfer token from the proxy contract
    // last one is the actual transfer from token called by the gravity bridge contract
    assert.equal(erc20Events.length, 3);

    const approveLog = approveInterface.decodeEventLog(
      "Approval",
      erc20Events[1].data,
      erc20Events[1].topics
    );
    assert.equal(approveLog[0], bridge.address);
    assert.equal(approveLog[1], bridgeContract);

    const transferLog = transferInterface.decodeEventLog(
      "Transfer",
      erc20Events[2].data,
      erc20Events[2].topics
    );
    assert.equal(transferLog[0], bridge.address);
    assert.equal(transferLog[1], bridgeContract);
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
    // there should be no gravity contract event
    assert.equal(
      events?.some((e) => e.address === bridgeContract),
      false
    );
  });

  it("bridgeFromERC20 swap eth to orai then swap orai to weth then send to cosmos", async function () {
    let oraiAmount = 1000;
    const nativeEthAmount = "1000000000";
    await bridge.bridgeFromETH(oraiAddr, oraiAmount, "", {
      value: nativeEthAmount,
    });
    await oraiContract.approve(bridge.address, oraiAmount);
    await bridge.sendToCosmos(oraiAddr, destination, 1);
    oraiAmount -= 1;

    const res = await bridge.bridgeFromERC20(
      oraiAddr,
      wethAddr,
      oraiAmount,
      1,
      destination
    );
    const { events } = await res.wait();
    const bridgeEvent = events?.find((e) => e.address === bridgeContract)!;
    const eventLog = gravityInterface.decodeEventLog(
      "SendToCosmosEvent",
      bridgeEvent.data,
      bridgeEvent.topics
    );
    assert.strictEqual(destination, eventLog._destination);
    assert.strictEqual(bridge.address, eventLog._sender);
  });
});
