import { getSigners } from 'hardhat';
import assert from 'assert';
import { Box__factory, Box } from '../typechain-types';

describe('Box', () => {
  const [owner] = getSigners(1);

  let box: Box;

  beforeEach(async function () {
    box = await new Box__factory(owner).deploy();
    await box.deployed();
  });

  it('retrieve returns a value previously stored', async function () {
    // Store a value
    await box.store(42);

    // Test if the returned value is the same one
    // We need to use strings to compare the 256 bit integers
    assert.strictEqual((await box.retrieve()).toString(), '42');
  });

  it('withdraw function exists after upgrade', async function () {
    await box.withdrawFeesCollected();
    assert.strictEqual((await box.retrieve()).toString(), '0');
  });
});
