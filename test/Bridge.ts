import { getSigners } from 'hardhat';
import assert from 'assert';
import { Bridge, Bridge__factory } from '../typechain-types';

describe('Bridge', () => {
  const [owner] = getSigners(1);

  console.log(owner);
  let bridge: Bridge;

  beforeEach(async function () {
    bridge = await new Bridge__factory(owner).deploy('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0xc778417E063141139Fce010982780140Aa0cD5Ab');
    await bridge.deployed();
  });

  it('retrieve returns contract addresses', async function () {
    // Store a value
    const contract = await bridge.gravityBridgeContract();
    const router = await bridge.swapRouter();
    const wrapped = await bridge.wrapNativeAddress();
    assert.strictEqual(contract, '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
    assert.strictEqual(router, '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
    assert.strictEqual(wrapped, '0xc778417E063141139Fce010982780140Aa0cD5Ab');
  });
});
