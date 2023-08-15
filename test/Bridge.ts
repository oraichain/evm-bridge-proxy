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
  let oraiAddr = "0x4c11249814f11b9346808179Cf06e71ac328c1b5";
  let routerAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  let wrapNativeAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let bridgeContract = "0x09Beeedf51AA45718F46837C94712d89B157a9D3";
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
    const chainId = await owner.getChainId();

    switch (chainId) {
      case 1: // eth
      case 31337: // fork eth
        break;
      case 56: // bnb
      case 5600: // fork bnb
        // bsc
        oraiAddr = "0xA325Ad6D9c92B55A3Fc5aD7e412B1518F96441C0";
        routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
        wrapNativeAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
        bridgeContract = "0xb40C364e70bbD98E8aaab707A41a52A2eAF5733f";
        break;
      default:
        return;
    }

    bridge = await new Bridge__factory(owner).deploy(
      bridgeContract,
      routerAddr,
      wrapNativeAddress
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
    assert.strictEqual(wrapped, wrapNativeAddress);
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
    // assert.equal(BigInt(transferLog[2]).toString(), "733");
  });

  it("bridgeFromETH swap eth to orai then send to cosmos", async function () {
    const res = await bridge.bridgeFromETH(oraiAddr, 1, destination, {
      value: "1",
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
    // assert.equal(BigInt(eventLog[3]).toString(), "733");

    const erc20Events = events?.filter((e) => e.address === oraiAddr)!;
    // length is 3 because the first call is the swap call
    // 2nd one is to approve for the gravity bridge contract to transfer token from the proxy contract
    // last one is the actual transfer from token called by the gravity bridge contract
    // assert.equal(erc20Events.length, 3);

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
    // assert.equal(BigInt(transferLog[2]).toString(), "733");
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
      wrapNativeAddress,
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
    let erc20Events = events?.filter((e) => e.address === wrapNativeAddress)!;
    // length is 2 because token out is weth, which has only two calls
    // 1st one when calling uniswap
    // last one is transfer back to the sender's wallet
    assert.equal(erc20Events.length, 2);

    const transferLog = transferInterface.decodeEventLog(
      "Transfer",
      erc20Events[1].data,
      erc20Events[1].topics
    );
    assert.equal(transferLog[0], bridge.address);
    assert.equal(transferLog[1], ownerAddress);
    // assert.equal(BigInt(transferLog[2]).toString(), "1");
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
      wrapNativeAddress,
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
    // assert.equal(BigInt(eventLog[3]).toString(), "1");

    const erc20Events = events?.filter((e) => e.address === wrapNativeAddress)!;
    // length is 3 because token out is weth, the first call is the swap call
    // 2nd is to approve for the gravity bridge contract to transfer token from the proxy contract
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
    // assert.equal(BigInt(transferLog[2]).toString(), "1");
  });
});
