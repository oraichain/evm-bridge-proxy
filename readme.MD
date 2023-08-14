# Pre-requisites

- An Ethereum wallet private key, which will be the only wallet able to withdraw fees from the contract
- The wallet address (starting with 0x)

# To use this code

Create a file `.env` in the project root directory containing the wallet private keys (or mnemonic) and api key:

```
cd proxy-contract
yarn && yarn compile
```

# To deploy the contract on the Rinkeby testnet for the first time

```
npx hardhat run --network rinkeby scripts/deploy.js
```

Take note of the contract address for interacting with the smart contract from now on

Check the contract has been deployed on [Etherscan](https://rinkeby.etherscan.io)

# To make changes to the existing contract on Rinkeby

Update `scripts/upgrade.js` with the address of your recently deployed contract ☝️

Edit the contract code in `contracts/Swap.sol`

```
npx hardhat run --network rinkeby scripts/upgrade.js
```

## To deploy the contract to a local blockchain

```
cd Documents/proxy-contract && npx hardhat node  # in a separate terminal window
npx hardhat run --network localhost scripts/deploy.js
```

## To interact with the contract running on the local node using the command line

```
npx hardhat run --network localhost scripts/upgrade.js
npx hardhat console --network localhost
const factory = await ethers.getContractFactory('Swap');
const contract = await factory.attach('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
await contract.swap(...);
```

## To interact with the contract running on the local node using JavaScript

```
npx hardhat run --network localhost ./scripts/index.js
```

## To run the unit tests

```
yarn test
```
