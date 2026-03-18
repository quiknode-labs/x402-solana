# @quicknode/x402-solana

[![Test](https://img.shields.io/github/actions/workflow/status/quiknode-labs/x402-solana/test.yml?branch=master&label=tests)](https://github.com/quiknode-labs/x402-solana/actions/workflows/test.yml)

Use [Solana Kit](https://github.com/anza-xyz/kit) with Quicknode's RPC — no account, no API key, no subscription needed. Just a Solana wallet file (like `id.json`) with some USDC. Payments are made as needed from the account using the [x402 protocol](https://x402.org).

## Installation

```sh
npm install @quicknode/x402-solana
```

## Usage

### With Solana Kit

```typescript
import { createSolanaX402Clients } from "@quicknode/x402-solana";
import { address } from "@solana/kit";
import { homedir } from "node:os";

const keyPairFile = `${homedir()}/.config/solana/id.json`;

const { rpc, rpcSubscriptions } = await createSolanaX402Clients(
  "mainnet",
  keyPairFile,
);
// That's it! Tat's all you need to start making transactions with your AI agents!

// Let's make a sample RPC call to test our connection!
const balance = await rpc
  .getBalance(address("dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8"))
  .send();
console.log("Balance:", balance.value);
```

### With Solana Kite

[Solana Kite](https://solanakite.org) wraps Solana Kit with a simpler API:

```typescript
import { createSolanaX402Clients } from "@quicknode/x402-solana";
import { connect, loadWalletFromFile } from "solana-kite";
import { homedir } from "node:os";

const keyPairFile = `${homedir()}/.config/solana/id.json`;

const { rpc, rpcSubscriptions } = await createSolanaX402Clients(
  "mainnet",
  keyPairFile,
);
const connection = connect(rpc, rpcSubscriptions);
// We have our Kite connection object and can access any of Kite's helper functions.

// For example, to quickly get the balance:
const wallet = await loadWalletFromFile(keyPairFile);

const balance = await connection.getBalance(wallet.address);
console.log("Balance:", balance);
```

## API

### `createSolanaX402Clients(network, keyPairFile, options?)`

Creates Solana RPC and WebSocket subscription clients that pay per-request via x402.

- `network` — `"mainnet" | "testnet" | "devnet"` — Solana network to connect to
- `keyPairFile` — `string` — Path to a Solana keypair JSON file
- `options.paymentNetwork` — `"mainnet" | "testnet" | "devnet"` — Network used for USDC payments. Defaults to the same network as `network`.
- `options.paymentModel` — `"credit-drawdown" | "pay-per-request"` — Payment model to use. Defaults to `"credit-drawdown"`.

Returns `{ rpc, rpcSubscriptions }`.

### Payment models

**`credit-drawdown`** (default) — authenticate once via SIWX, buy a bundle of credits with USDC, then consume credits across requests. Mainnet bundles require a minimum of $10 USDC in your wallet. Devnet bundles are available from $0.01. See the [Quicknode x402 guide](https://www.quicknode.com/guides/x402/access-quicknode-endpoints-with-x402-payments) for more details.

**`pay-per-request`** — pay individually for each request with no minimum bundle size. Bypasses SIWX/JWT session management entirely.

**Example: connect to mainnet, pay with devnet USDC**

```typescript
const { rpc, rpcSubscriptions } = await createSolanaX402Clients(
  "mainnet",
  keyPairFile,
  { paymentNetwork: "devnet" },
);
```

**Example: pay per request instead of using a credit bundle**

```typescript
const { rpc, rpcSubscriptions } = await createSolanaX402Clients(
  "mainnet",
  keyPairFile,
  { paymentModel: "pay-per-request" },
);
```

See the [Quicknode x402 guide](https://www.quicknode.com/guides/x402/access-quicknode-endpoints-with-x402-payments) for more information on using X402 with Quicknode.

## Prerequisites

- A Solana keypair file (e.g. `~/.config/solana/id.json` — the default location used by the Solana CLI)
- Some USDC in that wallet (at least $10 USDC on mainnet for the default `credit-drawdown` model; from $0.01 on devnet)

No Quicknode account or API key required. For testing, devnet USDC can pay for mainnet requests by passing `{ paymentNetwork: "devnet" }`.

## Tests

```sh
npm test
```

Integration tests (live RPC calls) run automatically when `~/.config/solana/id.json` exists with devnet USDC. They are skipped otherwise.

For CI, store your keypair JSON as a `SOLANA_KEYPAIR` repository secret.

## Building

```sh
npm run build
```

Compiles TypeScript to `dist/` with declaration files.
