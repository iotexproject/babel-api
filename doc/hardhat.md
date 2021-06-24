# Hardhat Integrate Guide

How to use hardhat, please refer to [the official hardhat document](https://hardhat.org/getting-started/)

This guide only describes how to configure hardhat so that you could development and deploy contracts on IOTEX network.

Let's assume that the server is deploy on HOST=https://babel-api.mainnet.iotex.io and you had already created a hardhat project.

## 1. Configure Hardhat

You could configure hardhat with mnemonic or private keys.
You could setup mnemonic or private keys in command line or .env, which not within the scope of this document.

### 1.2 Use Private Key
modify hardhat-config.js as below,
```
module.exports = {
  networks: {
    dev: {
      url: `${HOST}`,
      accounts: ['your private key'],
      chainId: 4690,
      gas: 8500000,
      gasPrice: 1000000000000
    },
  },
  ...
};
```

## 2. Deploy
```
npx hardhat run scripts/sample-script.js --network dev
```
