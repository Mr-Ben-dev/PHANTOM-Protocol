# PHANTOM Protocol

**Fully homomorphic encrypted prediction markets and automated price rounds — live on Arbitrum Sepolia.**

[Live Demo](https://phantom-protocol-chi.vercel.app/) · [GitHub](https://github.com/Mr-Ben-dev/PHANTOM-Protocol)

---

## The Problem

On transparent blockchains, every bet exposes amount, direction, timing, and pool sentiment. MEV bots front-run mempool transactions. Whales counter-trade visible positions. Analysts leak alpha the moment they bet. Public pool depths become real-time trading signals. Traditional prediction markets cannot protect strategic information.

---

## The Solution

PHANTOM runs market logic on **Fully Homomorphic Encryption (FHE)** through the **Fhenix CoFHE** coprocessor. Smart contracts accumulate encrypted pools, route bets, compare prices, and settle payouts on ciphertext. Individual positions stay private; only authorized aggregates are revealed at resolution.

---

## What Is Built

PHANTOM is a complete encrypted market stack with four deployed contracts, a production frontend, keeper automation, and 120 passing tests.

### PhantomBet — Binary Markets

Encrypted YES/NO prediction markets. Users encrypt amount and direction in the browser via `@cofhe/sdk`. The contract routes stakes with `FHE.select` and accumulates with `FHE.add`. Ten real markets live on testnet (BTC $150K, ETH $5K, Fed rates, SOL flip, DeFi TVL, AI tokens, BTC ETF, L2 TVL).

### PhantomToken ($PHTM)

FHERC20 confidential token. Balances are `euint64` ciphertexts with ACL-controlled access. Indicator-based `balanceOf` preserves ERC20 compatibility without leaking real balances.

### PhantomRounds — Price-Round Engine

Polymarket-style UP/DOWN rounds on BTC, ETH, and SOL in 5m/15m windows. Encrypted pool totals. Oracle-signed Binance settlement (EIP-191). Keeper Bot v3 automates create → lock → resolve → **CoFHE pool reveal**. Users reveal direction then claim ETH (97% to winners, 3% protocol fee). Live Binance WebSocket prices in the UI.

### PhantomMulti — Multi-Outcome Markets

Two to eight outcomes per market. Encrypted pools and bet amounts. Five seeded markets on testnet. Full bet → resolve → reveal → claim flow in the `/multi` page.

---

## Architecture

```
Browser (React + CoFHE SDK)
    ↓ encrypted inputs + wallet txs
Arbitrum Sepolia Contracts (PhantomBet · PhantomToken · PhantomRounds · PhantomMulti)
    ↓ FHE ops + ACL
Fhenix CoFHE Threshold Network
    ↓ threshold decrypt + signatures
On-chain publishDecryptResult → settlement
```

**Keeper Bot** polls every 30s: creates rounds, locks, resolves with signed oracle prices, and reveals encrypted pools via CoFHE — enabling continuous round operation without manual intervention.

---

## Privacy Boundary

| Public | Encrypted |
|---|---|
| Questions, assets, deadlines | Bet amounts and directions |
| Bettor counts | Pool totals before resolution |
| Final outcomes | Personal balances ($PHTM) |
| Aggregate pools after CoFHE reveal | Individual payout paths pre-claim |

---

## Deployed Contracts (Arbitrum Sepolia · 421614)

| Contract | Address |
|---|---|
| PhantomBet | `0x31a578f2c63a85Ae13E1e12A859a2B5f775De228` |
| PhantomToken | `0x78AF03022b1cD35e75642Ac2A043a6d2cE472228` |
| PhantomRounds | `0x76db8a0429d19e8440e3D290F79c0613834c72a1` |
| PhantomMulti | `0x674200f50Ee8816355dB3105d06fF799d15720F3` |

Keeper: `0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf`

---

## Frontend

React 18 · Vite 5 · wagmi 3.x · viem · @cofhe/sdk · shadcn/ui · Tailwind

**Pages:** Markets · Rounds · Multi · Positions · Docs

**Production features:** wallet connect, chain switching, CoFHE init, encrypted betting, round claim flow (reveal pools → reveal direction → claim), live prices, operator console, multi-outcome betting.

**Live:** https://phantom-protocol-chi.vercel.app/

---

## Production Readiness (Completed)

End-to-end audit verified and fixed:

- Keeper auto-reveals pools after round resolution
- Frontend + CLI complete claim lifecycle
- PhantomBet pool reveal ABI fix
- PhantomMulti deployed and seeded
- All env files synchronized across frontend, bot, and contract fallbacks
- 120 Hardhat tests passing · frontend build verified

See `RELEASE_REPORT.md` for full audit details.

---

## Tech Stack

Solidity 0.8.25 · Hardhat · @fhenixprotocol/cofhe-contracts · @cofhe/sdk · TypeScript · React · Vite · wagmi · viem · Binance API

---

## Why It Matters

When pool sentiment is invisible, it cannot be front-run. When directions are encrypted, strategies cannot be copied. When resolution reveals only aggregates, losers never expose their models. PHANTOM proves FHE is not just privacy — it is a new market design primitive for financial products that cannot exist on transparent chains.

*"A phantom exists but cannot be observed. Your position is real — but invisible on-chain."*
