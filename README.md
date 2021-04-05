# Babel-API

## 0. Overview

This document describes how to deploy and supported/unsupported APIs.

Other tools/environment integrate guide please refer to below,

* [Truffle](./doc/truffle.md)
* [Metamask](./doc/metamask.md)
* [Remix](./doc/remix.md)
* [Subgraph](./doc/subgraph.md)

## 1. Deploy

### 1.1 Environment
In this document, I depoly the system on Centos 7. If you are using any other OS, only a slight adjustment is needed.

### 1.2. Install Node v14
```
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash
sudo yum install nodejs
```

### 1.3. Configuration file
create xxx/.env
```
PORT=9000
```

### 1.4. Install Node Libraries
```
npm i
```

### 1.5. Build Source Code
```
npm run build
```

### 1.8. Start Service
```
npm start
```

## 2. Supported API
```
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getBalance
eth_gasPrice
eth_getTransactionCount
eth_sendRawTransaction
eth_call
eth_estimateGas
eth_getCode
eth_getTransactionReceipt
web3_clientVersion
net_version
net_peerCount
net_listening
eth_protocolVersion
eth_syncing
eth_getBlockTransactionCountByHash
eth_getBlockTransactionCountByNumber
eth_getBlockByHash
eth_getTransactionByHash
eth_getTransactionByBlockHashAndIndex
eth_getTransactionByBlockNumberAndIndex
eth_getLogs
```

## 3. Unsupported API
```
getpeers
eth_syncing
eth_coinbase
eth_mining
eth_hashrate
eth_accounts
eth_getStorageAt
eth_getUncleCountByBlockHash
eth_getUncleCountByBlockNumber
eth_sign
eth_signTransaction
eth_sendTransaction
eth_getUncleByBlockHashAndIndex
eth_getUncleByBlockNumberAndIndex
eth_getCompilers
eth_compileLLL
eth_compileSolidity
eth_compileSerpent
eth_newFilter
eth_newBlockFilter
eth_newPendingTransactionFilter
eth_uninstallFilter
eth_getFilterChanges
eth_getFilterLogs
eth_getWork
eth_submitWork
eth_submitHashrate
eth_pendingTransactions
db_putString
db_getString
db_putHex
db_getHex
shh_post
shh_version
shh_newIdentity
shh_hasIdentity
shh_newGroup
shh_addToGroup
shh_newFilter
shh_uninstallFilter
shh_getFilterChanges
shh_getMessages
```