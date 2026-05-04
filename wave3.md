# PHANTOM Protocol — Wave 3 (PhantomRounds) — Complete End-to-End Reference

> **Status:** LIVE on Arbitrum Sepolia — all contracts deployed, frontend connected, keeper bot verified working

---

## Deployed Contract Addresses (Arbitrum Sepolia, Chain ID 421614)

| Contract | Address | Explorer |
|---|---|---|
| **PhantomBet** | `0xD91A27a7BB8e4b3a16c6B201e938aafEedC20377` | [arbiscan](https://sepolia.arbiscan.io/address/0xD91A27a7BB8e4b3a16c6B201e938aafEedC20377) |
| **PhantomToken** | `0xBe087E28cB2c96e85EE56E3d0C6F47f1ee0af6d1` | [arbiscan](https://sepolia.arbiscan.io/address/0xBe087E28cB2c96e85EE56E3d0C6F47f1ee0af6d1) |
| **PhantomRounds** | `0xa6cE9C483B4Fd7e63d9740af53b09F7be19BA6aa` | [arbiscan](https://sepolia.arbiscan.io/address/0xa6cE9C483B4Fd7e63d9740af53b09F7be19BA6aa) |

**Deployer / Keeper wallet:** `0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf`  
**Network RPC:** `https://sepolia-rollup.arbitrum.io/rpc`

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                    PHANTOM Protocol — Wave 3                       │
│                FHE Encrypted Price-Round Markets                   │
└────────────────────────────────────────────────────────────────────┘

User Browser                Arbitrum Sepolia               Keeper Bot
     │                            │                              │
     │  connect MetaMask          │                              │
     │──────────────────────────► │                              │
     │                            │                              │
     │  cofheClient.encryptInputs(│                              │
     │    [{type:"bool", value:   │                              │
     │      true/false}])         │                              │
     │  → InEbool struct          │                              │
     │                            │                              │
     │  placeRoundBet(            │         createRound()        │
     │    roundId,                │◄─────────────────────────────│
     │    encDirectionUp,         │         lockRound()          │
     │    {value: ethAmount}      │◄─────────────────────────────│
     │  )─────────────────────────►         resolveRound()       │
     │                            │◄─────── (Binance price +     │
     │                            │          oracle sig)         │
     │  revealMyDirection(        │                              │
     │    roundId, direction, sig)│                              │
     │─────────────────────────── ►                              │
     │                            │                              │
     │  claimRoundPayout(roundId) │                              │
     │───────────────────────────►│                              │
     │                            │                              │
     │  ← ETH payout              │                              │
```

---

## Smart Contract: PhantomRounds.sol

**File:** `contracts/PhantomRounds.sol`  
**Inherits:** `PhantomACL` (role management + FHE ACL wrappers)  
**Compiler:** Solidity 0.8.25, `viaIR: true`, `evmVersion: "cancun"`, optimizer 200 runs  
**CoFHE:** `@fhenixprotocol/cofhe-contracts/FHE.sol`

### FHE Types Used

| Solidity Type | JS ABI Type | Description |
|---|---|---|
| `euint64` | `uint256` (bytes32) | Encrypted uint64 — pool totals, prices |
| `ebool` | `uint256` (bytes32) | Encrypted bool — bet direction, outcome |
| `InEuint64` | tuple `{ctHash,securityZone,utype,signature}` | Input from client for euint64 |
| `InEbool` | tuple `{ctHash,securityZone,utype,signature}` | Input from client for ebool |

### RoundStatus Enum

```solidity
enum RoundStatus {
    NONE,           // 0 — doesn't exist
    OPEN,           // 1 — accepting bets
    LOCKED,         // 2 — no new bets, awaiting settlement
    RESOLVED,       // 3 — resolved, claims open
    CANCELED,       // 4 — canceled, refunds open
    PENDING_REVEAL  // 5 — FHE.gte done, awaiting CoFHE threshold decrypt (SOL path)
}
```

### Storage Layout

```solidity
// Core round data
mapping(uint256 => Round) public rounds;

// FHE-encrypted direction per user per round (private — nobody can read)
mapping(uint256 => mapping(address => ebool)) private roundDirections;

// FHE-encrypted pool totals in gwei (private until revealed)
mapping(uint256 => euint64) private upPools;
mapping(uint256 => euint64) private downPools;

// FHE-encrypted outcome for SOL path (private until CoFHE decrypts)
mapping(uint256 => ebool) private encOutcomes;

// Plaintext stake amounts (amount visible, direction is not)
mapping(uint256 => mapping(address => uint256)) public ethStakes;

// Direction reveal state (after revealMyDirection())
mapping(uint256 => mapping(address => bool)) public revealedDirections;
mapping(uint256 => mapping(address => bool)) public directionRevealed;

// Bet and claim tracking
mapping(uint256 => mapping(address => bool)) public hasRoundBet;
mapping(uint256 => mapping(address => bool)) public hasRoundClaimed;

// Access control
mapping(address => bool) public roundBots;
mapping(address => bool) public oracleSigners;

uint256 public roundCount;
uint256 public pendingFees; // accumulated 3% protocol fees (wei)
bool    public paused;
```

### All Contract Functions

#### Admin (onlyOwner)

| Function | Args | Description |
|---|---|---|
| `setRoundBot(address bot, bool allowed)` | bot, allowed | Grant/revoke bot role |
| `setOracleSigner(address signer, bool allowed)` | signer, allowed | Grant/revoke oracle signer role |
| `setPaused(bool value)` | value | Pause/unpause the contract |
| `withdrawFees(address payable to)` | to | Withdraw accumulated 3% protocol fees |

#### Round Lifecycle (onlyBotOrOwner)

| Function | Args | Description |
|---|---|---|
| `createRound(bytes32 asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, bytes32 oracleRoundId)` → `uint256 roundId` | asset (bytes32 label), interval (300 or 900), startPrice (uint64, 8 decimal precision), lockAt (unix timestamp), settleAt (unix timestamp), oracleRoundId (bytes32 label) | Create a new round. Only 300s (5m) or 900s (15m) intervals allowed |
| `lockRound(uint256 roundId)` | roundId | OPEN → LOCKED. Requires `block.timestamp >= lockAt` |
| `resolveRound(uint256 roundId, uint64 endPrice, uint256 observedAt, bytes oracleSignature)` | roundId, endPrice (8 decimal precision), observedAt (unix timestamp), oracle sig | BTC/ETH path. Verifies oracle signature. FHE.gte(encEnd, encStart) → stored in encOutcomes. Marks pools public. Status → RESOLVED |
| `resolveRoundEncrypted(uint256 roundId, InEuint64 calldata encEndPrice)` | roundId, encrypted price from Binance | SOL path. Full FHE.gte in encrypted domain. Status → PENDING_REVEAL |
| `revealRoundOutcome(uint256 roundId, bool outcomeUp, uint64 endPrice, bytes calldata outcomeSig)` | roundId, decrypted outcome, endPrice, CoFHE threshold sig | After CoFHE decrypts SOL outcome. FHE.publishDecryptResult. Status → RESOLVED |
| `revealRoundPools(uint256 roundId, uint64 upPlaintext, bytes calldata upSig, uint64 downPlaintext, bytes calldata downSig)` | roundId, decrypted up pool (gwei), CoFHE sig, decrypted down pool (gwei), CoFHE sig | Reveal encrypted pool totals after CoFHE decryption. 5 params only |
| `cancelRound(uint256 roundId, string calldata reason)` | roundId, reason string | Cancel OPEN or LOCKED round |

#### User Actions (anyone)

| Function | Args | Description |
|---|---|---|
| `placeRoundBet(uint256 roundId, InEbool calldata encDirectionUp) payable` | roundId, encrypted direction (InEbool from cofheClient.encryptInputs) | ETH stake = msg.value. FHE.select routes gwei into UP or DOWN pool without revealing direction |
| `revealMyDirection(uint256 roundId, bool directionUp, bytes calldata sig)` | roundId, decrypted direction, CoFHE threshold sig | User proves their direction before claiming |
| `claimRoundPayout(uint256 roundId)` | roundId | Claim ETH payout. Requires `directionRevealed`, pools revealed, correct direction |
| `refundCanceledRound(uint256 roundId)` | roundId | Refund full ETH stake for CANCELED round |

#### View Functions

| Function | Returns | Description |
|---|---|---|
| `getRoundCount()` | `uint256` | Total number of rounds ever created |
| `getRoundCore(uint256 roundId)` | `(bytes32 asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, uint256 bettorCount, address creator, RoundStatus status)` | Core round metadata |
| `getRoundSettlement(uint256 roundId)` | `(uint64 endPrice, RoundStatus status, bool outcomeUp, bool poolsRevealed, uint64 revealedUpPool, uint64 revealedDownPool, uint64 revealedTotalPool, bytes32 oracleRoundId, uint256 observedAt)` | Settlement data |
| `getRoundEth(uint256 roundId)` | `(uint256 totalEth, uint256 userStake)` | Total ETH in round + caller's stake |
| `hasRoundBet(uint256, address)` | `bool` | Whether address has bet in round |
| `hasRoundClaimed(uint256, address)` | `bool` | Whether address has claimed/refunded |
| `ethStakes(uint256, address)` | `uint256` | ETH stake amount (plaintext) |
| `directionRevealed(uint256, address)` | `bool` | Whether user has revealed direction |
| `revealedDirections(uint256, address)` | `bool` | Revealed direction (true=UP) |
| `getRoundBet(uint256 roundId)` | `uint256` | Caller's ETH stake (reverts if no bet) |
| `getRoundDirection(uint256 roundId)` | `ebool` | Caller's encrypted direction handle |
| `getUpPool(uint256 roundId)` | `euint64` | Encrypted UP pool handle |
| `getDownPool(uint256 roundId)` | `euint64` | Encrypted DOWN pool handle |
| `oracleMessageHash(uint256 roundId, uint64 endPrice, uint256 observedAt)` | `bytes32` | Raw message hash for oracle to sign |
| `roundBots(address)` | `bool` | Whether address is authorized bot |
| `oracleSigners(address)` | `bool` | Whether address is authorized oracle signer |
| `paused()` | `bool` | Contract pause state |
| `pendingFees()` | `uint256` | Accumulated protocol fees (wei) |
| `roundCount()` | `uint256` | Total rounds created |

### Events

```solidity
event RoundBotSet(address indexed bot, bool allowed);
event OracleSignerSet(address indexed signer, bool allowed);
event PausedSet(bool paused);
event RoundCreated(uint256 indexed roundId, bytes32 indexed asset, uint32 intervalSeconds, uint64 startPrice, uint256 lockAt, uint256 settleAt, bytes32 oracleRoundId, address creator);
event RoundBetPlaced(uint256 indexed roundId, address indexed bettor, uint256 ethStake);
event RoundLocked(uint256 indexed roundId);
event RoundResolved(uint256 indexed roundId, bool outcomeUp, uint64 startPrice, uint64 endPrice, uint256 observedAt);
event RoundPendingReveal(uint256 indexed roundId);
event RoundOutcomeRevealed(uint256 indexed roundId, bool outcomeUp, uint64 endPrice);
event RoundPoolsRevealed(uint256 indexed roundId, uint64 upPool, uint64 downPool, uint64 totalPool);
event RoundPayoutClaimed(uint256 indexed roundId, address indexed bettor, uint256 amount);
event DirectionRevealed(uint256 indexed roundId, address indexed bettor, bool directionUp);
event RoundCanceled(uint256 indexed roundId, string reason);
event FeesWithdrawn(address indexed to, uint256 amount);
```

### Oracle Signature Scheme

```
raw_hash = keccak256(
  "PHANTOM_ROUND_ORACLE" ||
  block.chainid          ||  // 421614
  address(this)          ||  // PhantomRounds address
  roundId                ||
  endPrice               ||  // uint64, 8 decimal precision
  observedAt             ||  // unix timestamp
)

signed_hash = keccak256("\x19Ethereum Signed Message:\n32" || raw_hash)
signature = ecrecover(signed_hash) → must be in oracleSigners[]
```

**Price precision:** `$80500.99` → `8050099000000` (multiply by 1e8, round to uint64)

---

## Frontend

### Files Modified/Created

| File | Status | Description |
|---|---|---|
| `frontend/src/config/contracts.ts` | Updated | All 3 contract addresses + full PHANTOM_ROUNDS_ABI |
| `frontend/src/hooks/usePhantomRounds.ts` | Created | All 11 contract write hooks |
| `frontend/src/hooks/useEncryptBet.ts` | Updated | Direction-only FHE encryption via cofheClient |
| `frontend/src/hooks/useRounds.ts` | Updated | Reads all rounds, status 0-5 including PENDING_REVEAL |
| `frontend/src/hooks/useLivePrice.ts` | Created | Binance WebSocket live prices (BTC/ETH/SOL) |
| `frontend/src/pages/Rounds.tsx` | Updated | Full UI — bet, claim, refund, live prices, operator console |
| `frontend/.env` | Auto-generated | Written by `tasks/deploy.ts` after deployment |

### Contract Address Config (`frontend/src/config/contracts.ts`)

```typescript
// Reads from VITE_* env vars (written by deploy script)
// Falls back to hardcoded deployed addresses

export const PHANTOM_BET_ADDRESS    = "0xD91A27a7BB8e4b3a16c6B201e938aafEedC20377";
export const PHANTOM_TOKEN_ADDRESS  = "0xBe087E28cB2c96e85EE56E3d0C6F47f1ee0af6d1";
export const PHANTOM_ROUNDS_ADDRESS = "0xa6cE9C483B4Fd7e63d9740af53b09F7be19BA6aa";
export const CHAIN_ID = 421614;
```

### `frontend/.env` (auto-generated by deploy script)

```
VITE_PHANTOM_BET_ADDRESS=0xD91A27a7BB8e4b3a16c6B201e938aafEedC20377
VITE_PHANTOM_TOKEN_ADDRESS=0xBe087E28cB2c96e85EE56E3d0C6F47f1ee0af6d1
VITE_PHANTOM_ROUNDS_ADDRESS=0xa6cE9C483B4Fd7e63d9740af53b09F7be19BA6aa
VITE_CHAIN_ID=421614
```

### CoFHE Integration

**Config:** `frontend/src/config/cofhe.ts`
```typescript
createCofheConfig({ supportedChains: [chains.arbSepolia] })
cofheClient = createCofheClient(cofheConfig)  // singleton
```

**Wallet auth:** `frontend/src/hooks/useWalletAuth.ts` — auto-calls `connectCofhe(publicClient, walletClient)` when correct chain

**Encrypt direction:**
```typescript
// useEncryptBet.ts
const result = await cofheClient.encryptInputs([{ type: "bool", value: isUp }]);
// result[0] is InEbool = { ctHash, securityZone, utype, signature }
```

**ABI struct for InEbool / InEuint64:**
```typescript
// Both use identical 4-field tuple:
{
  type: "tuple",
  components: [
    { name: "ctHash",       type: "uint256" },
    { name: "securityZone", type: "uint8"   },
    { name: "utype",        type: "uint8"   },
    { name: "signature",    type: "bytes"   },
  ]
}
```

### wagmi Config (`frontend/src/config/wagmi.ts`)
- Chain: `arbitrumSepolia`
- Connectors: `injected()`, `metaMask()`
- Transport: `https://sepolia-rollup.arbitrum.io/rpc`

### Key Hooks

**`usePhantomRounds()`** — exports all write functions:
```typescript
{
  createRound(asset, intervalSeconds, startPrice, lockAt, settleAt, oracleRoundId),
  placeRoundBet(roundId: bigint, encDirectionUp: InEbool, ethAmount: bigint),
  lockRound(roundId),
  resolveRound(roundId, endPrice, observedAt, oracleSignature),
  resolveRoundEncrypted(roundId, encEndPrice: InEuint64),
  revealRoundOutcome(roundId, outcomeUp, endPrice, outcomeSig),
  revealRoundPools(roundId, upPlaintext, upSig, downPlaintext, downSig),
  revealMyDirection(roundId, directionUp, sig),
  claimRoundPayout(roundId),
  refundCanceledRound(roundId),
  cancelRound(roundId, reason),
}
```

**`useRounds()`** — reads all rounds via `useReadContracts` batch:
```typescript
interface Round {
  id: bigint;
  asset: string;          // decoded bytes32 → "BTC/USD"
  intervalSeconds: number;
  startPrice: bigint;
  lockAt: bigint;
  settleAt: bigint;
  bettorCount: bigint;
  creator: string;
  status: RoundStatus;    // 0–5
  endPrice: bigint;
  outcomeUp: boolean;
  poolsRevealed: boolean;
  revealedUpPool: bigint;
  revealedDownPool: bigint;
  oracleRoundId: string;
  hasBet: boolean;
  hasClaimed: boolean;
}
```

**`useLivePrice()`** — Binance WebSocket prices:
```typescript
// WebSocket: wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker
// Fallback REST: https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]

const { prices, connected } = useLivePrice();
// prices["BTC"] → { symbol, price, priceStr, change24h, changeStr, updatedAt }
```

### Rounds.tsx UI Flow

```
Page loads
  │
  ├── Live price ticker bar (BTC/ETH/SOL) — sticky below Navbar
  │
  ├── Stats row: Total Rounds | Active | Your Bets | FHE Encrypted
  │
  ├── Round cards (one per round):
  │     │
  │     ├── OPEN: ETH input + UP button + DOWN button
  │     │          → encrypt direction → placeRoundBet()
  │     │
  │     ├── RESOLVED + hasBet + poolsRevealed + !hasClaimed:
  │     │          → Claim Payout button → claimRoundPayout()
  │     │
  │     └── CANCELED + hasBet + !hasClaimed:
  │                → Refund button → refundCanceledRound()
  │
  └── Operator Console (sidebar):
        → create round: asset / interval / startPrice / lockDelay / settleDelay / oracleRoundId
```

### Critical Notes (do not break)
- `frontend/.npmrc`: `legacy-peer-deps=true` — **MUST keep**
- `vite.config.ts`: `worker: { format: "es" }` — **MUST keep** (CoFHE WASM worker)
- `euint64`/`ebool` return values declared as `uint256` in ABI (viem bigint compatible)
- `placeRoundBet` is `payable` — ETH sent as `msg.value`, not encrypted
- `revealRoundPools` has **5 params** only: no ctHash params

---

## Keeper Bot

### Files

| File | Description |
|---|---|
| `bot/keeper.ts` | Main keeper script — full round lifecycle automation |
| `bot/package.json` | Dependencies: `viem`, `tsx`, `dotenv` |
| `bot/.env` | Real environment variables (not committed) |
| `bot/.env.example` | Template for environment setup |
| `bot/README.md` | Setup and usage instructions |

### `bot/.env` (real values)

```env
PRIVATE_KEY=0x4878b1c7f1d57783b46297ce0e559f28e84dbb905f24d94f49bb2e7bb8d25a7d
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PHANTOM_ROUNDS_ADDRESS=0xa6cE9C483B4Fd7e63d9740af53b09F7be19BA6aa
POLL_INTERVAL_SECONDS=30
```

### Bot Responsibilities (every 30s tick)

1. **Authorization check** — verifies keeper is `roundBot` and `oracleSigner` (auto-true for deployer)
2. **Auto-create rounds** — creates BTC/USD, ETH/USD, SOL/USD 5m rounds when none are OPEN
3. **Lock rounds** — calls `lockRound(id)` when `block.timestamp >= lockAt` and status is OPEN
4. **Resolve rounds** — when `block.timestamp >= settleAt` and status is LOCKED:
   - Fetches live price from Binance REST (`/api/v3/ticker/price?symbol=BTCUSDT`)
   - Signs oracle message hash (see oracle signing scheme above)
   - Calls `resolveRound(roundId, endPrice, observedAt, signature)`

### Price Precision Conversion
```typescript
// $80,500.99 → uint64 with 8 decimal places
function priceToUint64(usdPrice: number): bigint {
  return BigInt(Math.round(usdPrice * 1e8));
}
// $80,500.99 → 8050099000000n
```

### Run

```bash
cd "D:\route\PHANTOM Protocol\bot"
npm install
npm start
```

**Verified working:** Bot connected to Arbitrum Sepolia, fetched live BTC price ($80,500.99), created round `0xca7ccae80845d37ffe7c25922b0a96e439ecaf8ebd0685c0c9780636adc13172`

---

## Deployment

### Deploy Script (`tasks/deploy.ts`)

Deploys all 3 contracts in order and writes `frontend/.env`:

```bash
cd "D:\route\PHANTOM Protocol"
npx hardhat run tasks/deploy.ts --network arbitrumSepolia
```

**Output:**
- Prints deployed addresses to console
- Writes `frontend/.env` with `VITE_*` address vars
- Deployer is automatically set as `roundBot` and `oracleSigner` in PhantomRounds constructor

### Hardhat Config Key Points
- Network: `arbitrumSepolia` (chainId 421614)
- Plugin: `@cofhe/hardhat-plugin` (loads mock CoFHE for local testing)
- Compiler: Solidity 0.8.25, `viaIR: true`, `evmVersion: "cancun"`

---

## Test Suite

**54 tests — all passing**

```bash
cd "D:\route\PHANTOM Protocol"
npx hardhat test test/PhantomRounds.test.ts
```

Test categories:
- Admin & Access Control (6 tests)
- Round Creation (5 tests)
- placeRoundBet / FHE direction encryption (multiple)
- lockRound timing (multiple)
- resolveRound / oracle signature verification (multiple)
- resolveRoundEncrypted / PENDING_REVEAL path (multiple)
- revealRoundOutcome / revealRoundPools (multiple)
- revealMyDirection / claimRoundPayout (multiple)
- refundCanceledRound / cancelRound (multiple)
- withdrawFees (multiple)
- pausable (multiple)

---

## Full Transaction Flow (User Journey)

```
1. Connect MetaMask to Arbitrum Sepolia
2. CoFHE client auto-initialized (useWalletAuth.ts)

3. OPEN round appears in Rounds.tsx (bot creates it)
4. User enters ETH amount (e.g. "0.01")
5. User clicks UP or DOWN
6. Frontend calls: cofheClient.encryptInputs([{type:"bool", value: isUp}])
   → gets InEbool = { ctHash, securityZone, utype, signature }
7. Frontend calls: placeRoundBet(roundId, encDirectionUp, { value: parseEther("0.01") })
   → tx confirmed → direction sealed on-chain with FHE

8. Bot: lockRound(roundId) at lockAt
9. Bot: fetches Binance price → signs oracle hash → resolveRound(roundId, endPrice, observedAt, sig)
   → FHE.gte(encEnd, encStart) → outcome stored as ebool → pools marked public
   → status = RESOLVED

10. (CoFHE decrypts pools) → bot: revealRoundPools(roundId, upPool, upSig, downPool, downSig)
    → r.poolsRevealed = true

11. User: revealMyDirection(roundId, direction, coFheSig)
    → directionRevealed[roundId][user] = true

12. User: claimRoundPayout(roundId)
    → payout = stake × (totalEth × 97%) / winPool
    → ETH transferred to user
```

---

## Environment Files Summary

| File | Location | Purpose |
|---|---|---|
| `.env` | `D:\route\PHANTOM Protocol\.env` | Root: PRIVATE_KEY, RPC URL for Hardhat |
| `frontend/.env` | `frontend/.env` | Vite: VITE_* contract addresses + CHAIN_ID |
| `bot/.env` | `bot/.env` | Keeper: PRIVATE_KEY (0x-prefixed), RPC_URL, PHANTOM_ROUNDS_ADDRESS |

---

## ABI Quick Reference (for external integrations)

### placeRoundBet (payable)
```json
{
  "name": "placeRoundBet",
  "type": "function",
  "stateMutability": "payable",
  "inputs": [
    { "name": "roundId", "type": "uint256" },
    {
      "name": "encDirectionUp",
      "type": "tuple",
      "components": [
        { "name": "ctHash",       "type": "uint256" },
        { "name": "securityZone", "type": "uint8" },
        { "name": "utype",        "type": "uint8" },
        { "name": "signature",    "type": "bytes" }
      ]
    }
  ],
  "outputs": []
}
```

### resolveRound
```json
{
  "name": "resolveRound",
  "type": "function",
  "stateMutability": "nonpayable",
  "inputs": [
    { "name": "roundId",         "type": "uint256" },
    { "name": "endPrice",        "type": "uint64" },
    { "name": "observedAt",      "type": "uint256" },
    { "name": "oracleSignature", "type": "bytes" }
  ],
  "outputs": []
}
```

### revealRoundPools (5 params — no ctHash)
```json
{
  "name": "revealRoundPools",
  "type": "function",
  "stateMutability": "nonpayable",
  "inputs": [
    { "name": "roundId",      "type": "uint256" },
    { "name": "upPlaintext",  "type": "uint64" },
    { "name": "upSig",        "type": "bytes" },
    { "name": "downPlaintext","type": "uint64" },
    { "name": "downSig",      "type": "bytes" }
  ],
  "outputs": []
}
```


---

## Frontend Design (Updated Wave 3 Session)

### Rounds.tsx Improvements
- **`formatPrice(value: bigint)`** → `$80,500.99` (divides by 1e8, adds $, comma-separates)
- **`formatCountdown(settleAt: bigint)`** → `4m 18s` countdown badge on OPEN rounds
- **Round card** redesigned:
  - Header: asset badge + status chip + interval + live countdown badge
  - Price grid: 4-column (Start Price, End Price, Lock, Settle) with dollar formatting
  - Pool bar: YES%/NO% visual bar with percentages
  - Bettors count
  - Action buttons: UP/DOWN bet input + Claim/Refund based on status
- **Operator Console** redesigned:
  - Asset selector (BTC/USD, ETH/USD, SOL/USD buttons)
  - Interval selector (5m, 15m)
  - Start price auto-populated from live Binance price via `useLivePrice`
  - Shows human-readable `$80,500.99` preview alongside raw uint64

### Markets.tsx — Polymarket-Style Redesign
- **8 static featured markets** with Unsplash images, category chips, YES/NO % bars, volume, deadline
- **Category filters** sidebar: All / Crypto / Finance / Politics / Regulation / Tech
- **Stats strip**: Total Volume, Active Markets, FHE Encrypted %
- **FeaturedCard** component: image header, category badge, HOT/NEW chip, YES/NO bar, bet buttons
- **Detail modal** on click: full-size image, question, YES/NO buttons, "preview market" label
- On-chain markets section below featured grid (reads from PhantomBet contract via `useMarkets`)
- Integrated tabs: Active / Resolved / My Bets

---

## How to Test Everything

### 1. Start the dev server
```bash
cd frontend
bun install       # or npm install --legacy-peer-deps
bun run dev       # → http://localhost:5173
```

### 2. Test Live Prices (Rounds page)
1. Navigate to `/rounds`
2. You should see live BTC/ETH/SOL prices updating in real-time (top of Operator Console)
3. Click "BTC/USD" asset selector → startPrice input auto-fills with current BTC price in uint64
4. The preview shows `$84,xxx.xx` next to the raw number

### 3. Test Round Creation (Manual)
1. Connect MetaMask to Arbitrum Sepolia (chain 421614)
2. Make sure your wallet is the deployer (0x18398aA1...) or has been added as roundBot
3. Select BTC/USD, 5m interval — start price auto-fills
4. Click "+ Create Round"
5. Approve MetaMask tx → round appears in the list within seconds
6. **Verify on Arbiscan**: https://sepolia.arbiscan.io/address/0xa6cE9C483B4Fd7e63d9740af53b09F7be19BA6aa

### 4. Test Betting
1. A round must be OPEN (status chip = green "OPEN")
2. Enter ETH amount (e.g. `0.001`)
3. Click UP or DOWN → MetaMask tx → bet recorded on-chain
4. Round card shows `1 bettors` after tx confirms

### 5. Test the Keeper Bot
```bash
cd bot
cp .env.example .env  # fill in PRIVATE_KEY, PHANTOM_ROUNDS_ADDRESS
npm install
npx tsx keeper.ts
```
Output should show:
```
═══════════════════════════════════════════════════════════
  PHANTOM Keeper Bot v2 — 24/7 round automation
  Keeper  : 0x18398aA1...
  Contract: 0xa6cE9C48...
  Poll    : 30s
═══════════════════════════════════════════════════════════
[2025-...] ─── tick ─────────────────────────────────────────────────────
[2025-...] Auto-creating BTC/USD @ $84,210.45...
[2025-...]   ✅ createRound(BTC/USD): 0x...hash...
[2025-...]   Rounds on-chain: 3
```

### 6. Wait for Auto-Resolve
- After `interval` seconds (300s for 5m rounds), keeper automatically calls `resolveRound`
- Round status changes: OPEN → LOCKED → RESOLVED
- Resolved rounds show green (UP) or red (DOWN) end price

### 7. Test Claim Payout
1. After round reaches RESOLVED status
2. If you bet on the winning side, "Claim Payout" button appears
3. Click → MetaMask tx → ETH transferred to your wallet

### 8. Test Markets Page
1. Navigate to `/markets`
2. See 8 featured Polymarket-style cards with images
3. Use category filter (Crypto / Finance / Politics...) to filter
4. Click any card to see the detail modal with YES/NO buttons
5. "Create Market" button opens the on-chain create market modal

### 9. Verify On-Chain State via Arbiscan
- PhantomRounds read functions: `getRoundCount`, `getRoundCore(id)`, `getRoundSettlement(id)`
- Check keeper wallet has `roundBots(0x18398...)` = true
- Check keeper wallet has `oracleSigners(0x18398...)` = true
- These are set in the constructor automatically

### 10. Run Contract Tests
```bash
cd ..   # root of repo
npx hardhat test test/PhantomRounds.test.ts
# → 54 tests passing
```

---

## 24/7 Bot Deployment (Production)

### Option A: PM2 (recommended for VPS)
```bash
npm install -g pm2
cd bot
pm2 start "npx tsx keeper.ts" --name phantom-keeper --restart-delay 5000
pm2 save
pm2 startup  # enable on reboot
```

### Option B: systemd (Linux VPS)
```ini
# /etc/systemd/system/phantom-keeper.service
[Unit]
Description=PHANTOM Protocol Keeper Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/bot
ExecStart=/usr/bin/npx tsx keeper.ts
Restart=always
RestartSec=10
EnvironmentFile=/path/to/bot/.env

[Install]
WantedBy=multi-user.target
```
```bash
systemctl enable phantom-keeper
systemctl start phantom-keeper
systemctl status phantom-keeper
```

### Option C: Railway / Render (cloud)
- Set env vars: PRIVATE_KEY, RPC_URL, PHANTOM_ROUNDS_ADDRESS, POLL_INTERVAL_SECONDS
- Start command: `npx tsx bot/keeper.ts`
- Auto-restarts on crash

