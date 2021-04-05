# Truffle Integrate Guide

How to use truffle, please refer to [The official truffle document](https://www.trufflesuite.com/docs/truffle)

This guide only describes how to configure truffle so that you could development and deploy contracts on IOTEX network.

Let's assume that the server is deploy on HOST=http://babal-api.iotex.io:8545 and you had already created a truffle project.

## 1. Install Package
[@truffle/hdwallet-provider](https://www.npmjs.com/package/@truffle/hdwallet-provider)
```
npm install @truffle/hdwallet-provider --save
```

## 2. Configure Truffle

You could configure tuffle with mnemonic or private keys.
You could setup mnemonic or private keys in command line or .env, which not within the scope of this document.

### 2.1. Use Mnemonic
modify truffle-config.js as below,
```
const { MNEMONIC } = process.env;
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    dev: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: MNEMONIC,
          },
          providerOrUrl: `${HOST}`,
          shareNonce: true,
        }),
      network_id: 4689,    // IOTEX mainnet chain id 4689
    }
  }
}
```

### 2.2 Use Private Key
modify truffle-config.js as below,
```
const HDWalletProvider = require('@truffle/hdwallet-provider');

const privateKeys = [
  "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580",
  "9549f39decea7b7504e15572b2c6a72766df0281cea22bd1a3bc87166b1ca290",
];

module.exports = {
  networks: {
    dev: {
      provider: () => new HDWalletProvider(privateKeys, `${HOST}`, 0, 2),
      network_id: 4689,    // IOTEX mainnet chain id 4689
    }
  }
}
```

## 3. Deploy
```
MNEMONIC=`Your mnemonic` truffle migrate --reset --network dev
```