# Sample Hardhat 3 Beta Project (`node:test` and `viem`)

This project showcases a Hardhat 3 Beta project using the native Node.js test runner (`node:test`) and the `viem` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run deployments to any of the supported networks (Sepolia, Somnia, or Chiliz), you need an account with funds to send the transaction. The provided Hardhat configuration uses two private keys:

- `ADMIN_PRIVATE_KEY` - Used for contract deployments and main transactions
- `VERIFIER_PRIVATE_KEY` - Used for verification operations (optional)

To set these keys, create a `.env` file in your project root:

```shell
# Required for deployments
ADMIN_PRIVATE_KEY=your_admin_private_key_here

# Optional for verification
VERIFIER_PRIVATE_KEY=your_verifier_private_key_here

# Optional API keys for enhanced Sepolia RPC
ALCHEMY_KEY=your_alchemy_key_here
INFURA_KEY=your_infura_key_here
```

After setting the variable, you can run deployments to any of the supported networks:

```shell
# Sepolia testnet
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts

# Somnia network
npx hardhat ignition deploy --network somnia ignition/modules/Counter.ts

# Chiliz Chain
npx hardhat ignition deploy --network chiliz ignition/modules/Counter.ts
```

### Supported Networks

- **hardhat**: Local development network (default)
- **localhost**: Local node at http://127.0.0.1:8545
- **sepolia**: Ethereum Sepolia testnet (chainId: 11155111)
- **somnia**: Somnia network (chainId: 50311)
- **chiliz**: Chiliz Chain (chainId: 88888)
