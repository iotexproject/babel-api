# Subgraph Integrate Guide

This guide only describes how to configure Subgraph so that you could development and deploy dApp on IOTEX network.

How to use Subgraph, please refer to [the official Subgraph document](https://thegraph.com/docs/introduction).

Since subgraph works base on truffle, you should configure truffle first, refer to [truffle integrate guide](./truffle.md).

Let's assume that the server is deploy on HOST=http://babal-api.iotex.io:8545

Before deploying graph-node, please modify 'graph-node/docker/docker-compose.yml' as below,

```
services:
  graph-node:
    environment:
      ethereum: 'mainnet:http://babal-api.iotex.io:8545'
```