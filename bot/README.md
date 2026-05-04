# PHANTOM Protocol Keeper Bot

Automates the full round lifecycle for PhantomRounds:

1. **Lock** — calls `lockRound()` when `lockAt` expires
2. **Resolve** — fetches live Binance price, signs oracle message, calls `resolveRound()`
3. **Auto-create** — creates new BTC/USD 5m rounds when none are OPEN

## Setup

```bash
cd bot
npm install
cp .env.example .env
# Fill in PRIVATE_KEY, PHANTOM_ROUNDS_ADDRESS
```

## Configuration (`.env`)

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | `0x...` — deployer / keeper wallet key |
| `RPC_URL` | Arbitrum Sepolia RPC (default: public endpoint) |
| `PHANTOM_ROUNDS_ADDRESS` | Deployed contract address |
| `ORACLE_SIGNER_KEY` | Optional — separate oracle signing key |
| `POLL_INTERVAL_SECONDS` | Tick frequency (default: 30s) |

## Run

```bash
npm start
```

## Contract Authorization

Before the bot works, the deployer must call:

```solidity
PhantomRounds.setRoundBot(keeperAddress, true);
PhantomRounds.setOracleSigner(keeperAddress, true);
```

Or use the deployer address as the keeper (it's already an authorized bot/signer via constructor).

## Price Flow

| Asset | Path |
|---|---|
| BTC | Binance REST → `resolveRound()` (plaintext + oracle sig) |
| ETH | Binance REST → `resolveRound()` (plaintext + oracle sig) |
| SOL | Binance REST → `resolveRound()` (testnet) |

## Architecture Notes

- Oracle signature: `sign(keccak256("PHANTOM_ROUND_ORACLE" ++ chainId ++ contract ++ roundId ++ endPrice ++ observedAt))`
- Price precision: uint64 with 8 decimal places (e.g. `$67,500.00` → `6750000000000`)
- No database needed — reads all state from contract on each tick
