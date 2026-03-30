/**
 * PHANTOM Protocol — Deployed Contract Addresses + ABIs
 *
 * Addresses written by tasks/deploy.ts after deployment to Arbitrum Sepolia.
 * ABI notes:
 *   • euint64 / ebool return values → declared as uint256 in JS ABI
 *     (viem decodes both identically; uint256 gives bigint directly, which
 *      is what cofheClient.decryptForView / decryptForTx expects)
 *   • InEuint64 / InEbool params → 4-field tuple structs
 */

// ─── Addresses ──────────────────────────────────────────────────────────────

export const PHANTOM_BET_ADDRESS =
  (import.meta.env.VITE_PHANTOM_BET_ADDRESS as `0x${string}`) ||
  "0xFB9c10423EAaD015dDb04f5aC85273f1B3F7A566";

export const PHANTOM_TOKEN_ADDRESS =
  (import.meta.env.VITE_PHANTOM_TOKEN_ADDRESS as `0x${string}`) ||
  "0x31666B7ECf736c0c6014F0cd63C646B7f4Af3887";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 421614);

// ─── InEuint64 / InEbool ABI structs ────────────────────────────────────────

export const IN_EUINT64_TYPE = {
  type: "tuple",
  components: [
    { name: "ctHash",       type: "uint256" },
    { name: "securityZone", type: "uint8"   },
    { name: "utype",        type: "uint8"   },
    { name: "signature",    type: "bytes"   },
  ],
} as const;

export const IN_EBOOL_TYPE = {
  type: "tuple",
  components: [
    { name: "ctHash",       type: "uint256" },
    { name: "securityZone", type: "uint8"   },
    { name: "utype",        type: "uint8"   },
    { name: "signature",    type: "bytes"   },
  ],
} as const;

// ─── PhantomBet ABI ─────────────────────────────────────────────────────────

export const PHANTOM_BET_ABI = [
  // ── State reads ────────────────────────────────────────────────
  {
    name: "marketCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMarketCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMarketInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [
      { name: "question",          type: "string"  },
      { name: "deadline",          type: "uint256" },
      { name: "resolutionTime",    type: "uint256" },
      { name: "bettorCount",       type: "uint256" },
      { name: "resolved",          type: "bool"    },
      { name: "outcome",           type: "bool"    },
      { name: "creator",           type: "address" },
      { name: "poolsRevealed",     type: "bool"    },
      { name: "revealedYesPool",   type: "uint64"  },
      { name: "revealedNoPool",    type: "uint64"  },
      { name: "revealedTotalPool", type: "uint64"  },
    ],
  },
  {
    // Returns euint64 handle — declared as uint256 so viem decodes as bigint
    name: "getMyBet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns ebool handle — declared as uint256 for same reason
    name: "getMyBetSide",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns euint64 handle
    name: "getYesPool",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns euint64 handle
    name: "getNoPool",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "hasBet",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_marketId", type: "uint256" },
      { name: "_user",     type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "hasClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_marketId", type: "uint256" },
      { name: "_user",     type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "roles",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  // ── Writes ─────────────────────────────────────────────────────
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_question",       type: "string"  },
      { name: "_deadline",       type: "uint256" },
      { name: "_resolutionTime", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    name: "placeBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",  type: "uint256"           },
      { name: "_encAmount", ...IN_EUINT64_TYPE         },
      { name: "_encSide",   ...IN_EBOOL_TYPE           },
    ],
    outputs: [],
  },
  {
    name: "resolveMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId", type: "uint256" },
      { name: "_outcome",  type: "bool"    },
    ],
    outputs: [],
  },
  {
    name: "revealPools",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",     type: "uint256" },
      { name: "yesCtHash",     type: "uint256" },   // euint64 handle as uint256
      { name: "yesPlaintext",  type: "uint64"  },
      { name: "yesSignature",  type: "bytes"   },
      { name: "noCtHash",      type: "uint256" },
      { name: "noPlaintext",   type: "uint64"  },
      { name: "noSignature",   type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "claimPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "grantRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_role", type: "uint8"   },
    ],
    outputs: [],
  },
  // ── Events ─────────────────────────────────────────────────────
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "marketId",      type: "uint256", indexed: true  },
      { name: "question",      type: "string",  indexed: false },
      { name: "deadline",      type: "uint256", indexed: false },
      { name: "resolutionTime",type: "uint256", indexed: false },
      { name: "creator",       type: "address", indexed: false },
    ],
  },
  {
    name: "BetPlaced",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "bettor",   type: "address", indexed: true },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "outcome",  type: "bool",    indexed: false },
    ],
  },
  {
    name: "PoolsRevealed",
    type: "event",
    inputs: [
      { name: "marketId",   type: "uint256", indexed: true  },
      { name: "yesPool",    type: "uint64",  indexed: false },
      { name: "noPool",     type: "uint64",  indexed: false },
      { name: "totalPool",  type: "uint64",  indexed: false },
    ],
  },
  {
    name: "PayoutClaimed",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "bettor",   type: "address", indexed: true },
    ],
  },
] as const;
