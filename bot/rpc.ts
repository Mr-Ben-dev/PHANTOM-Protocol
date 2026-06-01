/**
 * Arbitrum Sepolia RPC with automatic fallback.
 * Primary: RPC_URL env or public endpoint.
 * Fallback: RPC_URL_FALLBACK env or Alchemy.
 */
import { fallback, http, type Transport } from "viem";

const PRIMARY_RPC =
  process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";

const FALLBACK_RPC =
  process.env.RPC_URL_FALLBACK ??
  "https://arb-sepolia.g.alchemy.com/v2/ZgPbIdk3SH1HsAxQBHTw6";

export function arbSepoliaTransport(readTimeoutMs = 20_000, writeTimeoutMs = 30_000): Transport {
  return fallback(
    [
      http(PRIMARY_RPC, { timeout: readTimeoutMs }),
      http(FALLBACK_RPC, { timeout: writeTimeoutMs }),
    ],
    { rank: false },
  );
}
