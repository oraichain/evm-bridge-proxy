import { getSigners } from 'hardhat';
import assert from 'assert';
import { Bridge, Bridge__factory, IUniswapV2Router02__factory } from '../typechain-types';

describe('Bridge', () => {
  const [owner] = getSigners(1);

  let bridge: Bridge;
  const oraiAddr = '0x4c11249814f11b9346808179cf06e71ac328c1b5';
  const routerAddr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const bridgeContract = '0x09Beeedf51AA45718F46837C94712d89B157a9D3';

  beforeEach(async function () {
    bridge = await new Bridge__factory(owner).deploy(bridgeContract, routerAddr, wethAddr);
    await bridge.deployed();
  });

  it('retrieve returns contract addresses', async function () {
    // Store a value
    const contract = await bridge.gravityBridgeContract();
    const router = await bridge.swapRouter();
    const wrapped = await bridge.wrapNativeAddress();
    assert.strictEqual(contract, bridgeContract);
    assert.strictEqual(router, routerAddr);
    assert.strictEqual(wrapped, wethAddr);
  });

  it('swap eth to orai', async function () {
    const uniswapRouterV2 = IUniswapV2Router02__factory.connect(routerAddr, owner);
    const paths = [wethAddr, oraiAddr];
    try {
      const [_, outAmount] = await uniswapRouterV2.getAmountsOut('1000000000', paths);
      const ret = await bridge.bridgeFromETH(paths[1], outAmount, '', {
        value: '1000000000'
      });
      console.log(ret);
    } catch (ex) {
      console.log(ex);
    }
  });
});
