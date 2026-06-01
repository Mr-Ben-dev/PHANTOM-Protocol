# PHANTOM Protocol — Production Readiness Release Report

**Date:** 2026-06-01  
**Network:** Arbitrum Sepolia (421614)  
**Keeper / Deployer:** `0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf`

---

## Deployed Contract Addresses

| Contract | Address | Status |
|---|---|---|
| PhantomBet | `0x31a578f2c63a85Ae13E1e12A859a2B5f775De228` | ✅ Live (10 markets on-chain) |
| PhantomToken ($PHTM) | `0x78AF03022b1cD35e75642Ac2A043a6d2cE472228` | ✅ Deployed (no UI integration) |
| PhantomRounds | `0x76db8a0429d19e8440e3D290F79c0613834c72a1` | ✅ Live (12 rounds on-chain) |
| PhantomMulti | `0x674200f50Ee8816355dB3105d06fF799d15720F3` | ✅ **New deploy** (5 markets seeded) |

On-chain verification: keeper is `roundBot` and `oracleSigner` on PhantomRounds.

---

## Environment Synchronization

| File | Updated |
|---|---|
| `frontend/.env` | All `VITE_*` addresses including `VITE_PHANTOM_MULTI_ADDRESS` |
| `bot/.env` | `PHANTOM_ROUNDS_ADDRESS`, `PHANTOM_MULTI_ADDRESS` |
| `frontend/src/config/contracts.ts` | `??` fallbacks for all addresses |
| `tasks/deploy.ts` | Now writes both `frontend/.env` and `bot/.env` |
| `tasks/deployPhantomMulti.ts` | Writes frontend + bot Multi address |
| `README.md` | Removed duplicate stale Wave 1 section |
| `wave3.md` | Fixed stale `0xa6cE9C…` addresses |

**Vercel checklist:** Set all 5 `VITE_*` variables from `frontend/.env`.

---

## Fixes Applied

### PhantomRounds (highest priority)

| Issue | Fix |
|---|---|
| Keeper stopped at `resolveRound` — pools never revealed | [`bot/keeper.ts`](bot/keeper.ts) v3: CoFHE `decryptForTx` + `revealRoundPools` after resolve |
| Frontend claim skipped `revealMyDirection` | [`RoundPositionActions`](frontend/src/components/rounds/RoundPositionActions.tsx): pools → direction → claim flow |
| CLI `claim` failed without reveal steps | [`bot/cli.ts`](bot/cli.ts): `reveal-pools`, `reveal-direction` commands |
| Operator console 5m rounds only had 60s betting window | Lock/settle delays aligned with keeper (`lock=interval`, `settle=interval+60`) |
| Positions page ignored round bets | [`Positions.tsx`](frontend/src/pages/Positions.tsx): round positions section |

### PhantomBet

| Issue | Fix |
|---|---|
| `usePhantomBet.revealPools` swapped signature args | Fixed arg order to match contract ABI |

### PhantomMulti (Wave 4)

| Issue | Fix |
|---|---|
| Contract not deployed | Deployed to `0x674200f50Ee8816355dB3105d06fF799d15720F3` |
| Seed script used past deadlines | [`bot/seed-multi-markets.ts`](bot/seed-multi-markets.ts): relative future dates + idempotent skip |
| 5 multi-outcome markets on-chain | Seeded successfully |

### Bot infrastructure

- Added [`bot/cofhe.ts`](bot/cofhe.ts) + `@cofhe/sdk` dependency for keeper/CLI CoFHE decrypt
- Added [`tasks/verify-onchain.ts`](tasks/verify-onchain.ts) for RPC sanity checks

---

## Feature Status Checklist

| Feature | Status |
|---|---|
| PhantomBet — create market | ✅ Working |
| PhantomBet — FHE bet (CoFHE) | ✅ Working (requires live CoFHE in browser) |
| PhantomBet — resolve market | ✅ Working |
| PhantomBet — reveal pools | ✅ Fixed (was broken arg order) |
| PhantomBet — claim payout | ⚠️ Partial — marks claimed only, no token/ETH transfer by design |
| PhantomToken | ⚠️ Contract live, no wallet UI |
| PhantomRounds — bet (simple) | ✅ Working |
| PhantomRounds — keeper create/lock/resolve | ✅ Working |
| PhantomRounds — keeper pool reveal | ✅ Fixed |
| PhantomRounds — user direction reveal + claim | ✅ Fixed (frontend + CLI) |
| PhantomRounds — cancel/refund | ✅ Working |
| PhantomRounds — SOL encrypted resolve path | ⚠️ Partial — keeper uses plaintext path; PENDING_REVEAL needs manual `revealRoundOutcome` |
| PhantomMulti — deploy + markets | ✅ Working |
| PhantomMulti — bet/resolve/reveal/claim UI | ✅ Connected via `/multi` |
| Wallet + CoFHE init | ✅ Working |
| Live Binance prices (Rounds) | ✅ Working |

---

## Tests & Build

| Check | Result |
|---|---|
| Hardhat full suite | **120 passing** (119 + 1 new lifecycle test) |
| PhantomRounds E2E test | ✅ Passes through resolve; pool reveal uses live CoFHE on testnet |
| Frontend production build | ✅ Success |

---

## Remaining Known Limitations

1. **PhantomBet `claimPayout`** — records claim on-chain but does not transfer funds (documented in contract).
2. **PhantomToken** — deployed FHERC20 with no frontend mint/transfer UI.
3. **`placeRoundBetSimple`** — direction visible in calldata (trivial on-chain encryption tradeoff).
4. **PENDING_REVEAL rounds** — no public `getEncOutcome` getter; keeper logs and skips automated outcome reveal.
5. **First PhantomMulti seed market** — one market from initial seed used a past deadline; re-run seed creates remaining 4; 5 total markets live.

---

## How to Run

```bash
# Contracts
npx hardhat test

# Keeper (pool reveal + round automation)
cd bot && npm start

# Frontend
cd frontend && npm run build && npm run dev

# Verify on-chain state
npx hardhat run tasks/verify-onchain.ts --network arbitrumSepolia
```

---

*PHANTOM Protocol production-readiness pass complete.*
