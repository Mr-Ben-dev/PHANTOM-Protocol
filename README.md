# PHANTOM Protocol

> **The world''s first fully homomorphically encrypted prediction market.**
> Bet on real-world outcomes with completely private positions  powered by Fhenix CoFHE on Arbitrum.

[![Live on Testnet](https://img.shields.io/badge/Live-Arbitrum%20Sepolia-0affab?style=flat-square)](https://sepolia.arbiscan.io/address/0xFB9c10423EAaD015dDb04f5aC85273f1B3F7A566)
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
