# PHANTOM Protocol

**The world's first fully homomorphically encrypted prediction market + price-round engine.**
Wave 3 — Live on Arbitrum Sepolia | [Live Demo](https://phantom-protocol-chi.vercel.app/)

---

## The Problem

On transparent blockchains, every bet — amount, direction, timing — is publicly visible. MEV bots front-run from the mempool, whales copy institutional forecasts, pool depths expose real-time sentiment. The moment a sophisticated analyst bets, their thesis becomes public signal.

The only solution is a cryptographic primitive that enables computation on data without ever revealing it.

---

## The Solution: Fully Homomorphic Encryption

PHANTOM uses **FHE** — the only scheme enabling computation directly on ciphertext, without decryption. Bets are encrypted before leaving your browser. The smart contract operates entirely on encrypted ciphertext. Pool totals stay encrypted until resolution; individual bets stay private permanently. FHE is real computation on real secrets.

---

## Wave 1: PhantomBet — Binary Prediction Markets

Fully encrypted YES/NO prediction markets using Fhenix CoFHE.

- `FHE.select()` routes each bet on encrypted direction — contract never sees which side you chose
- `FHE.add()` accumulates pool totals on `euint64` handles; CoFHE threshold-decryption reveals only the winning aggregate at close — individual positions stay private forever

**8 real markets seeded on-chain:**

1. Will Bitcoin reach $150,000 by December 2026?
2. Will Ethereum break $5,000 in Q3 2026?
3. Will the US Federal Reserve cut rates before August 2026?
4. Will Solana flip Ethereum by market cap before end of 2026?
5. Will DeFi total TVL exceed $200B by end of 2026?
6. Will any AI token enter the crypto top 10 by market cap in Q3 2026?
7. Will Bitcoin spot ETF daily inflows exceed $1B in a single day in 2026?
8. Will Ethereum Layer 2 total TVL surpass $100B by September 2026?

---

## Wave 2: PhantomToken ($PHTM)

PHANTOM's native FHERC20. Balances are `euint64` ciphertexts; only ACL-permitted parties can read them. Invisible transfers, standard ERC20 interface.

---

## Wave 3: PhantomRounds — Automated Price-Round Engine

Automated price-round markets on live Binance prices. Bet UP or DOWN on BTC, ETH, or SOL in 5m/15m windows. Keeper bot (`bot/keeper.ts`) polls every 30s:

1. **Create** — opens round with Binance `startPrice`, sets `lockAt` and `settleAt`
2. **Lock** — calls `lockRound()` at `lockAt`; no new bets accepted
3. **Resolve** — computes EIP-191 oracle hash, calls `resolveRound()`. `FHE.gte(encEndPrice, encStartPrice)` evaluates outcome entirely on ciphertext.
4. **Claim** — `revealMyDirection()` then `claimRoundPayout()`. 3% fee; 97% to winners.

Oracle: `keccak256("PHANTOM_ROUND_ORACLE" || chainId || contract || roundId || endPrice || observedAt)`, verified by ecrecover (EIP-191). Direction: `FHE.asEbool(isUp)` on-chain — no SDK, any EVM wallet.

---

## Contract Architecture

**PhantomACL.sol** — FHE ACL + roles: CREATOR, BETTOR, RESOLVER, AUDITOR.

**PhantomBet.sol** — `createMarket`, `placeBet` (FHE.select), `resolveMarket`, `revealPools` (ECDSA), `claimPayout`. Solidity 0.8.25, `viaIR: true`, `evmVersion: cancun`.

**PhantomToken.sol** — $PHTM FHERC20. Balances are `euint64` ciphertexts; only ACL-permitted addresses can read them.

**PhantomRounds.sol** — 6 statuses (NONE/OPEN/LOCKED/RESOLVED/CANCELED/PENDING_REVEAL). Encrypted `euint64` pools, `ebool` outcomes. EIP-191 oracle sig. 54 tests.

---

## Deployed Addresses (Arbitrum Sepolia, Chain ID 421614)

| Contract | Address |
|---|---|
| PhantomBet | `0x31a578f2c63a85Ae13E1e12A859a2B5f775De228` |
| PhantomToken ($PHTM) | `0x78AF03022b1cD35e75642Ac2A043a6d2cE472228` |
| PhantomRounds | `0x76db8a0429d19e8440e3D290F79c0613834c72a1` |

Deployer / Keeper: `0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf`

---

## Privacy Boundary

| Always Public | Always Encrypted |
|---|---|
| Market questions & metadata | Individual bet amounts |
| Bettor count (not identities) | Individual bet directions |
| Resolved outcome (YES/NO, UP/DOWN) | Pool totals (before resolution) |
| Pool totals (after resolution only) | Personal payout amounts & $PHTM balances |

---

## Frontend

React 18 + Vite 5 + TypeScript · wagmi 3.x + viem 2.x · @cofhe/sdk 0.4.0 · shadcn/ui + Tailwind · framer-motion · Binance WebSocket live prices.

**Pages:** Markets (3-col grid, inline detail panel), Rounds (price-round betting + operator console), Positions (decryption), Docs.

---

## Five Waves

| Wave | Module | Status | Description |
|---|---|---|---|
| 1 | PhantomBet | ✅ Live | Binary encrypted prediction markets |
| 2 | PhantomToken | ✅ Live | FHERC20 encrypted native token |
| 3 | PhantomRounds | ✅ Live | Price-round engine, keeper bot, 8 live markets |
| 4 | PhantomMulti | Upcoming | Multi-outcome encrypted markets (210 buckets) |
| 5 | PhantomOracle | Research | AI resolution on encrypted oracle feeds |

---

## Why This Changes Markets

When pool sentiment is invisible, it cannot be front-run. When bet directions are encrypted, strategies cannot be copied. When resolution reveals only aggregates, losers never expose their models. Funds, quant traders, and analysts who avoid transparent markets can now participate without broadcasting their thesis — market accuracy improves and liquidity deepens.

PHANTOM proves FHE is not merely a privacy feature. It is a new market design primitive — a category of financial product that cannot exist without it.

---

## Built With

Fhenix CoFHE · @fhenixprotocol/cofhe-contracts · @cofhe/sdk · wagmi 3.x + viem 2.x · React 18 + Vite 5 · Hardhat · TypeScript

Live Demo: https://phantom-protocol-chi.vercel.app/
GitHub: https://github.com/Mr-Ben-dev/PHANTOM-Protocol

*"A phantom exists but cannot be observed. Your position is real — but invisible on-chain."*
