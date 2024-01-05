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
    "channel-1/orai19a4cjjdlx5fpsgfz7t4tgh6kn6heqg87xhfqth",
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
