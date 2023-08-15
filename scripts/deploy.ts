import { ethers, getSigners } from "hardhat";
import { Bridge__factory } from "../typechain-types";

// eth
let routerAddr = ethers.utils.getAddress(
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
);
let wrapNativeAddress = ethers.utils.getAddress(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
);
let bridgeContract = ethers.utils.getAddress(
  "0x09Beeedf51AA45718F46837C94712d89B157a9D3"
);

async function main() {
  const [owner] = getSigners(1);
  const chainId = await owner.getChainId();
  console.log("chain id: ", chainId);
  switch (chainId) {
    case 1:
      break;
    case 56:
      // bsc
      routerAddr = ethers.utils.getAddress(
        "0x10ED43C718714eb63d5aA57B78B54704E256024E"
      );
      wrapNativeAddress = ethers.utils.getAddress(
        "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
      );
      bridgeContract = ethers.utils.getAddress(
        "0xb40C364e70bbD98E8aaab707A41a52A2eAF5733f"
      );
      break;
    default:
      return;
  }
  console.log(routerAddr, wrapNativeAddress, bridgeContract);
  const deploy = await new Bridge__factory(owner).deploy(
    bridgeContract,
    routerAddr,
    wrapNativeAddress
  );
  const result = await deploy.deployed();
  console.log("deployed: ", result.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
