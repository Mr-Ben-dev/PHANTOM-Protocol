# PHANTOM Protocol

> **The world's first fully homomorphically encrypted prediction market + price-round engine.**
> Bet on real-world outcomes and live price movements with completely private positions — powered by Fhenix CoFHE on Arbitrum Sepolia.

[![Live on Testnet](https://img.shields.io/badge/Live-Arbitrum%20Sepolia-0affab?style=flat-square)](https://sepolia.arbiscan.io/address/0x31a578f2c63a85Ae13E1e12A859a2B5f775De228)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.25-363636?style=flat-square)](https://soliditylang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Wave](https://img.shields.io/badge/Wave-3%20Live-7c3aed?style=flat-square)](#roadmap)

---

## Overview

On transparent blockchains, prediction markets are fundamentally broken:
- Bots **front-run your bet** before it lands on-chain
- Whales **track your exact position size** and counter-trade you
- Institutional forecasters **leak alpha** the instant they place a bet
- Pool depths are public, enabling **MEV extraction** at every step

PHANTOM solves this with **Fully Homomorphic Encryption (FHE)** — the only cryptographic scheme that allows computation directly on encrypted data. Smart contracts accumulate bets into pools, route outcomes, and compute payouts **entirely on ciphertext**. No plaintext ever touches the chain. No amount, no direction, no pool total — nothing is visible until the exact moment of resolution, and even then only the aggregate matters.

Wave 3 extends this foundation with **PhantomRounds** — a fully on-chain automated price-round market engine where users bet on whether BTC, ETH, or SOL will be higher or lower in a fixed time window. 8 real prediction markets are live on-chain with FHE-encrypted pools.

---

## Deployed Contracts — Arbitrum Sepolia (Chain ID 421614)

| Contract | Address | Role |
|---|---|---|
| **PhantomBet** | `0x31a578f2c63a85Ae13E1e12A859a2B5f775De228` | Binary YES/NO prediction markets |
| **PhantomToken ($PHTM)** | `0x78AF03022b1cD35e75642Ac2A043a6d2cE472228` | FHERC20 encrypted native token |
| **PhantomRounds** | `0x76db8a0429d19e8440e3D290F79c0613834c72a1` | Wave 3 price-round engine |

- **Network:** Arbitrum Sepolia
- **RPC:** `https://sepolia-rollup.arbitrum.io/rpc`
- **FHE Coprocessor:** [Fhenix CoFHE](https://docs.fhenix.zone)
- **Deployer / Keeper:** `0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf`

All 8 live prediction markets seeded on PhantomBet: BTC $150K, ETH $5K, Fed rate cut, SOL flip, DeFi $200B TVL, AI token top 10, BTC ETF $1B day, L2 $100B TVL.

---

## Wave 3 — PhantomRounds

Wave 3 introduces **automated price-round markets** on top of the existing FHE infrastructure:

- **5-minute and 15-minute price rounds** for BTC/USD, ETH/USD, SOL/USD
- **Keeper bot** (bot/keeper.ts) automates the full round lifecycle: create → lock → resolve → repeat
- **Oracle signature scheme**: keeper fetches live Binance prices, signs `keccak256("PHANTOM_ROUND_ORACLE" || chainId || contractAddress || roundId || endPrice || observedAt)` using EIP-191 personal sign, posted on-chain with ecrecover verification
- **FHE bet direction**: `placeRoundBetSimple(roundId, bool)` trivially encrypts direction via `FHE.asEbool(isUp)` on-chain — no client-side CoFHE required for rounds
- **Pool privacy**: UP and DOWN pool totals are `euint64` encrypted handles until resolution — nobody, including the operator, can see which side is heavier
- **CLI tool** (bot/cli.ts): manual contract interaction for status, create, bet, lock, resolve, claim, cancel

### Round Lifecycle

```
createRound() → OPEN (bets accepted)
    ↓ bot locks at lockAt timestamp
lockRound() → LOCKED (no new bets)
    ↓ bot resolves at settleAt with Binance price + oracle sig
resolveRound() → RESOLVED
    ↓ CoFHE threshold-decrypts pool totals
revealRoundPools() → pools public, claims open
    ↓ users reveal direction then claim
claimRoundPayout() → ETH payout (97% of pool, 3% protocol fee)
```

---

## How It Works

### PhantomBet (Wave 1 — Binary Markets)

```
Browser (@cofhe/sdk)
  1. Encrypt bet amount  → InEuint64 ciphertext handle
  2. Encrypt bet direction → InEbool ciphertext handle

PhantomBet.sol (Arbitrum Sepolia)
  3. FHE.select(direction, yesPool, noPool)  → route bet to correct pool
  4. FHE.add(pool, amount)                   → accumulate pool total (homomorphic)
  5. FHE.allowThis(handle)                   → contract retains ACL access
  6. FHE.allow(handle, bettor)               → bettor granted view access

Resolver (after deadline)
  7. resolveMarket(outcome)
  8. FHE.allowPublic(winningPool)            → authorize threshold decryption

CoFHE Threshold Network
  9. Nodes collectively decrypt pool total
  10. FHE.publishDecryptResult(hash, val, sig) → plaintext + ECDSA proof on-chain

Winners
  11. claimPayout() → proportional share from public pool totals
      (individual bets stay encrypted forever)
```

### PhantomRounds (Wave 3 — Price Rounds)

```
Keeper Bot (every 30s poll)
  1. createRound(asset, interval, startPrice, lockAt, settleAt, oracleRoundId)
  2. lockRound(roundId) at lockAt timestamp

User Browser
  3. placeRoundBetSimple(roundId, isUp) payable
     → FHE.asEbool(isUp) encrypts direction on-chain
     → FHE.select routes ETH into encrypted UP or DOWN pool

Keeper Bot (at settleAt)
  4. Fetch Binance endPrice
  5. Sign: keccak256("PHANTOM_ROUND_ORACLE" || chainId || contract || roundId || endPrice || observedAt)
  6. resolveRound(roundId, endPrice, observedAt, oracleSignature)
     → FHE.gte(encEndPrice, encStartPrice) → encrypted outcome
     → status = RESOLVED

Winners
  7. revealMyDirection(roundId, directionUp, coFheSig)
  8. claimRoundPayout(roundId) → ETH payout
```

---

## Repository Structure

```
PHANTOM Protocol/
├── contracts/
│   ├── PhantomACL.sol          # Abstract base: role enum + FHE ACL helpers
│   ├── PhantomBet.sol          # Wave 1: binary prediction market (core)
│   ├── PhantomToken.sol        # $PHTM FHERC20 encrypted token
│   └── PhantomRounds.sol       # Wave 3: price-round engine with keeper
│
├── test/
│   └── PhantomRounds.test.ts   # 54 tests — all passing
│
├── tasks/
│   └── deploy.ts               # Deploy script + auto-writes frontend/.env
│
├── bot/
│   ├── keeper.ts               # 24/7 round automation bot
│   ├── cli.ts                  # Manual CLI: status/create/bet/lock/resolve/claim
│   ├── seed-markets.ts         # Seeds 8 real prediction markets on PhantomBet
│   ├── package.json            # viem, tsx, dotenv
│   └── .env.example            # Template (copy to .env, never commit real .env)
│
├── hardhat.config.ts           # Solidity 0.8.25, viaIR: true, cancun EVM
├── wave3.md                    # Complete Wave 3 technical reference
│
└── frontend/
    ├── vercel.json             # SPA routing fallback for Vercel
    └── src/
        ├── config/
        │   ├── wagmi.ts            # wagmi 3.x, Arbitrum Sepolia
        │   ├── cofhe.ts            # CoFHE client singleton
        │   ├── contracts.ts        # All 3 contract ABIs + addresses
        │   └── market-metadata.ts  # Images/categories for 8 seeded markets
        ├── hooks/
        │   ├── useWalletAuth.ts        # Connect, chain switch, FHE init
        │   ├── usePhantomRounds.ts     # All Wave 3 write hooks
        │   ├── useRounds.ts            # Batch-read all round data
        │   ├── useLivePrice.ts         # Binance WebSocket BTC/ETH/SOL prices
        │   ├── useMarkets.ts           # Batch-read PhantomBet markets
        │   └── useEncryptBet.ts        # CoFHE encrypt wrapper
        └── pages/
            ├── Index.tsx       # Landing page
            ├── Markets.tsx     # 8 live prediction markets (3-col card grid)
            ├── Rounds.tsx      # Price-round betting UI + operator console
            ├── Positions.tsx   # Personal positions + decryption
            └── Docs.tsx        # Full protocol documentation
```

---

## Key Technical Details

### Solidity Configuration

```typescript
// hardhat.config.ts
solidity: {
  version: "0.8.25",
  settings: {
    viaIR: true,           // Required: tuple returns + CoFHE interface
    evmVersion: "cancun",  // Required: Fhenix CoFHE transient storage opcodes
    optimizer: { enabled: true, runs: 200 },
  }
}
```

### Oracle Signature Scheme (Wave 3)

```typescript
// Keeper: bot/keeper.ts
const msgHash = keccak256(encodePacked(
  ["string", "uint256", "address", "uint256", "uint64", "uint256"],
  ["PHANTOM_ROUND_ORACLE", chainId, contractAddress, roundId, endPrice, observedAt]
));
// CRITICAL: use signMessage (EIP-191), NOT sign (raw secp256k1)
const sig = await account.signMessage({ message: { raw: msgHash } });
```

### FHE Types — PhantomRounds

| Solidity Type | JS ABI Type | Description |
|---|---|---|
| `euint64` | `uint256` | Encrypted pool totals in gwei |
| `ebool` | `uint256` | Encrypted bet direction |
| `InEuint64` | tuple (4 fields) | Client-side encrypted price input |
| `InEbool` | tuple (4 fields) | Client-side encrypted direction input |

### Price Precision

All prices are `uint64` with 8 decimal places:
- `$80,500.99` → `8050099000000` (multiply by 1e8)
- Binance returns float strings → `BigInt(Math.round(price * 1e8))`

---

## Frontend Stack

| Package | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| wagmi | 3.x | EVM wallet + contract interaction |
| viem | 2.x | Low-level Ethereum client |
| @cofhe/sdk | 0.4.0 | FHE encrypt/decrypt in browser |
| framer-motion | latest | Animations |
| shadcn/ui + Tailwind | latest | Component library + styling |
| React Router | v6 | SPA routing |

**Important:** `frontend/.npmrc` contains `legacy-peer-deps=true` — this must not be removed. `vite.config.ts` must keep `worker: { format: "es" }` for CoFHE WASM worker compatibility.

---

## Running Locally

### Contracts & Tests

```bash
npm install
npx hardhat test                                              # 54 tests
npx hardhat run tasks/deploy.ts --network arbitrumSepolia    # Deploy all 3
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps    # or: bun install
cp .env.example .env              # fill in addresses (or use hardcoded fallbacks)
npm run dev                       # → http://localhost:5173
```

### Keeper Bot

```bash
cd bot
npm install
cp .env.example .env    # fill in PRIVATE_KEY + PHANTOM_ROUNDS_ADDRESS
npx tsx keeper.ts       # starts 30s polling loop
```

### CLI Tool

```bash
cd bot
npx tsx cli.ts status                      # show all rounds
npx tsx cli.ts create btc 300              # create 5m BTC round
npx tsx cli.ts bet 0 up 0.01              # bet 0.01 ETH UP on round 0
npx tsx cli.ts lock 0                     # lock round 0
npx tsx cli.ts resolve 0 95000.00 1746400000  # resolve with price
npx tsx cli.ts claim 0                    # claim payout
```

### Seed Markets

```bash
cd bot
npx tsx seed-markets.ts    # idempotent — skips already-created markets
```

---

## Environment Variables

### `frontend/.env`

```env
VITE_PHANTOM_BET_ADDRESS=0x31a578f2c63a85Ae13E1e12A859a2B5f775De228
VITE_PHANTOM_TOKEN_ADDRESS=0x78AF03022b1cD35e75642Ac2A043a6d2cE472228
VITE_PHANTOM_ROUNDS_ADDRESS=0x76db8a0429d19e8440e3D290F79c0613834c72a1
VITE_CHAIN_ID=421614
```

### `bot/.env`

```env
PRIVATE_KEY=0x...your_key...
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PHANTOM_ROUNDS_ADDRESS=0x76db8a0429d19e8440e3D290F79c0613834c72a1
POLL_INTERVAL_SECONDS=30
```

---

## Deploying to Vercel

1. **Import** the GitHub repository in Vercel
2. **Root directory:** `frontend`
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. **Add environment variables** in Vercel dashboard (all 4 `VITE_*` vars above)

SPA routing is handled by `frontend/vercel.json` — all routes fall back to `index.html`.

---

## Roadmap

| Wave | Module | Status | Description |
|---|---|---|---|
| 1 | **PhantomBet** | ✅ Live | Binary YES/NO prediction markets, fully FHE-encrypted |
| 2 | **PhantomToken ($PHTM)** | ✅ Live | FHERC20 encrypted native token |
| 3 | **PhantomRounds** | ✅ Live | Automated price-round markets + keeper bot + 8 seeded markets |
| 4 | **PhantomMulti** | Upcoming | Multi-outcome markets (up to 210 options per market) |
| 5 | **PhantomOracle** | Research | AI-powered resolution on encrypted oracle feeds |

---

## Security

- Bet amounts, directions, and pool totals are **never stored in plaintext** on-chain
- Every ciphertext has an on-chain ACL — no unauthorized decryption is possible
- Resolution exposes **only aggregate pool totals**, never individual bets
- Oracle signatures use **EIP-191 personal sign** — verified by `ecrecover` after `\x19Ethereum Signed Message:\n32` prefix
- CoFHE uses a **threshold network** — no single node can decrypt alone
- Protocol takes **3% fee** on winning pools — remainder goes to winners

---

## License

MIT — PHANTOM Protocol

---

*"The future is encrypted. Bet on it."*

[![Solidity](https://img.shields.io/badge/Solidity-0.8.25-363636?style=flat-square)](https://soliditylang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## Overview

On transparent blockchains, prediction markets are broken:
- Bots **front-run** your bet before it lands
- Whales **track your position size** and counter-trade
- Institutional forecasters **leak alpha** the moment they bet

PHANTOM solves this with **Fully Homomorphic Encryption (FHE)**  the only cryptographic scheme that allows computation directly on encrypted data. The smart contract accumulates bets into pools, routes outcomes, and computes payouts **entirely on ciphertext**. No plaintext ever touches the chain.

---

## Deployed Contracts  Arbitrum Sepolia

| Contract | Address |
|---|---|
| **PhantomBet** | `0xFB9c10423EAaD015dDb04f5aC85273f1B3F7A566` |
| **PhantomToken ($PHTM)** | `0x31666B7ECf736c0c6014F0cd63C646B7f4Af3887` |

- **Chain ID:** `421614`
- **RPC:** `https://sepolia-rollup.arbitrum.io/rpc`
- **FHE Coprocessor:** [Fhenix CoFHE](https://docs.fhenix.zone)

---

## How It Works

```
Browser (@cofhe/sdk)
  1. Encrypt bet amount  InEuint64 ciphertext handle
  2. Encrypt bet direction  InEbool ciphertext handle
        
        
PhantomBet.sol (Arbitrum Sepolia)
  3. FHE.select(direction, yesPool, noPool)  route bet to correct pool
  4. FHE.add(pool, amount)                  accumulate pool total
  5. FHE.allowThis(handle)                  contract retains ACL access
  6. FHE.allow(handle, bettor)              bettor granted view access
        
         (after betting closes)
Resolver
  7. resolveMarket(outcome)
  8. FHE.allowPublic(winningPool)           authorize threshold decryption
        
        
CoFHE Threshold Network
  9. Nodes collectively decrypt pool total
  10. FHE.publishDecryptResult(hash, value, sig)  plaintext + ECDSA proof on-chain
        
        
Winners
  11. claimPayout()  proportional share from public pool totals
      (individual bets stay encrypted forever)
```

---

## Repository Structure

```
PHANTOM Protocol/
 contracts/
    PhantomACL.sol         # Abstract base: role enum + FHE ACL helpers
    PhantomBet.sol         # Wave 1: binary prediction market (core)
    PhantomToken.sol       # $PHTM FHERC20 encrypted token

 test/
    PhantomBet.test.ts     # 21 test cases  all passing

 tasks/
    deploy.ts              # Deploy script + auto-writes frontend/.env

 hardhat.config.ts          # Solidity 0.8.25, viaIR: true, cancun EVM

 frontend/
     vercel.json            # SPA routing fix for Vercel
     src/
         config/
            wagmi.ts       # wagmi 3.x config, Arbitrum Sepolia
            cofhe.ts       # CoFHE client singleton
            contracts.ts   # PhantomBet ABI + addresses
         hooks/
            useWalletAuth.ts      # Connect, chain switch, FHE init
            useFHEStatus.ts       # 4-step FHE state machine
            useEncryptBet.ts      # cofheClient.encryptInputs wrapper
            usePhantomBet.ts      # All 5 contract writes (gas buffered)
            useMarkets.ts         # Batch read all market data
            useDecryptPosition.ts # Decrypt own bet with EIP-712 permit
            useDecryptPools.ts    # Decrypt + publish pool totals
         components/
            markets/
               BetInterface.tsx       # YES/NO toggle + FHE encrypt + submit
               CreateMarketModal.tsx  # Create market form
               PositionPanel.tsx      # Decrypt bet + claim payout
               ResolutionPanel.tsx    # Resolve + reveal pools
            shared/
                AsyncStepper.tsx       # 4-step FHE progress UI
                EncryptedValue.tsx     # Show ciphertext hash / reveal button
         pages/
             Index.tsx      # Landing page
             Markets.tsx    # Live market list + betting
             Positions.tsx  # Personal positions + decryption
             Docs.tsx       # Full protocol documentation
```

---

## Key Technical Details

### Solidity Configuration

```typescript
// hardhat.config.ts
solidity: {
  version: "0.8.25",
  settings: {
    viaIR: true,           // Required: PhantomBet returns 11 values from getMarketInfo()
    evmVersion: "cancun",  // Required: Fhenix CoFHE transient storage opcodes
    optimizer: { enabled: true, runs: 200 },
  }
}
```

### Gas Strategy (Arbitrum Sepolia)

Arbitrum Sepolia''s EIP-1559 fee oracle returns stale values. PHANTOM uses legacy gas pricing:

```typescript
// usePhantomBet.ts
const gasPrice = await publicClient.getGasPrice();
const bufferedGas = (gasPrice * 13n) / 10n;  // +30% buffer

await writeContract({ ...args, gasPrice: bufferedGas });
```

### FHE Operations in PhantomBet.sol

```solidity
// Encrypted bet routing  no plaintext direction ever seen
euint64 yesAdd = FHE.select(direction, amount, FHE.asEuint64(0));
euint64 noAdd  = FHE.select(direction, FHE.asEuint64(0), amount);
market.yesPool = FHE.add(market.yesPool, yesAdd);
market.noPool  = FHE.add(market.noPool,  noAdd);

// Grant bettor ACL access to their own ciphertext
FHE.allow(market.yesPool, msg.sender);
FHE.allowThis(market.yesPool);
```

---

## Frontend Stack

| Package | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| wagmi | 3.x | EVM wallet + contract interaction |
| viem | 2.x | Low-level Ethereum client |
| @cofhe/sdk | 0.4.0 | FHE encrypt/decrypt in browser |
| framer-motion | latest | Animations |
| shadcn/ui + Tailwind | latest | Component library + styling |
| React Router | v6 | SPA routing |

---

## Running Locally

### Prerequisites

- Node.js 18+ or Bun
- MetaMask with Arbitrum Sepolia funds
- (Optional) Hardhat for contract development

### Contracts

```bash
npm install
npx hardhat test          # Run 21 tests
npx hardhat run tasks/deploy.ts --network arbSepolia  # Deploy
```

### Frontend

```bash
cd frontend
bun install               # or npm install
cp .env.example .env      # Add deployed addresses
bun dev                   # or npm run dev
```

### Environment Variables

Create `frontend/.env`:

```env
VITE_PHANTOM_BET_ADDRESS=0xFB9c10423EAaD015dDb04f5aC85273f1B3F7A566
VITE_PHANTOM_TOKEN_ADDRESS=0x31666B7ECf736c0c6014F0cd63C646B7f4Af3887
VITE_CHAIN_ID=421614
```

---

## Deploying to Vercel

1. **Import** the GitHub repository in Vercel
2. **Root directory:** `frontend`
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. **Add environment variables** (same as above)

SPA routing is handled by `frontend/vercel.json`  all routes fall back to `index.html`.

---

## Roadmap

PHANTOM is architectured in five sequential waves:

| Wave | Module | Status | Description |
|---|---|---|---|
| 1 | **PhantomBet** |  Live | Binary YES/NO prediction markets, fully encrypted |
| 2 | **PhantomMulti** | Upcoming | Multi-outcome markets (210 options) |
| 3 | **PhantomLiquidity** | Research | Encrypted AMM with invisible pool depths |
| 4 | **PhantomFutures** | Research | Perpetual markets with encrypted funding rates |
| 5 | **PhantomOracle** | Research | AI-powered resolution on encrypted oracle feeds |

---

## Security

- Bet amounts, directions, and pool totals are **never stored in plaintext** on-chain
- Every ciphertext has an on-chain ACL  no unauthorized decryption is possible
- Resolution exposes **only aggregate pool totals**, never individual bets
- EIP-712 typed data permits are required for all personal decryption requests
- CoFHE uses a **threshold network**  no single node can decrypt alone

---

## License

MIT  PHANTOM Protocol

---

*"The future is encrypted. Bet on it."*
