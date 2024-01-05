import { getSigners } from "hardhat";
import { Bridge__factory } from "../typechain-types";
import { contracts } from "../constants";

// bsc
const { bnb, proxyContract } = contracts;
let { wrapNativeAddr } = bnb;

async function main() {
  const [owner] = getSigners(1);
  const bridge = new Bridge__factory(owner).attach(proxyContract);
  const res = await bridge.bridgeFromETH(
    wrapNativeAddr,
    "1",
    "channel-29/orai1g4h64yjt0fvzv5v2j8tyfnpe5kmnetejvfgs7g",
    {
      value: "1",
    }
  );
  const result = await res.wait();
  console.log(result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
