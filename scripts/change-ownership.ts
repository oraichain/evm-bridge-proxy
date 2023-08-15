import { ethers, getSigners } from "hardhat";
import { Bridge__factory } from "../typechain-types";

// mainnet eth & bsc
const proxyContract = ethers.utils.getAddress(
  "0x758191e89ff9E898D884ca3426e486e5d8476A44"
);

async function main() {
  const [owner] = getSigners(1);
  const chainId = await owner.getChainId();
  console.log("chain id: ", chainId);
  // const ownerAddress = await owner.getAddress();
  const deploy = new Bridge__factory(owner).attach(proxyContract);
  const contract = await deploy.deployed();
  await contract.transferOwnership(
    ethers.utils.getAddress("0xD7F771664541b3f647CBA2be9Ab1Bc121bEEC913") // multi-sig
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
