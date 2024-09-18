import { ethers, getSigners } from "hardhat";
import { CW20ERC20Token__factory } from "../typechain-types";

async function main() {
  const erc20Address = process.env.ERC20_ADDRESS!;
  const [owner] = getSigners(1);
  const deployed = new CW20ERC20Token__factory(owner).attach(erc20Address);
  await deployed.transfer("0x9000000000000000000000000000000000000001", "1000");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
