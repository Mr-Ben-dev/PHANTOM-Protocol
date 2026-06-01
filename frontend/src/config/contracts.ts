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
  (import.meta.env.VITE_PHANTOM_BET_ADDRESS as `0x${string}` | undefined) ??
  "0x31a578f2c63a85Ae13E1e12A859a2B5f775De228";

export const PHANTOM_TOKEN_ADDRESS =
  (import.meta.env.VITE_PHANTOM_TOKEN_ADDRESS as `0x${string}` | undefined) ??
  "0x78AF03022b1cD35e75642Ac2A043a6d2cE472228";

export const PHANTOM_ROUNDS_ADDRESS =
  (import.meta.env.VITE_PHANTOM_ROUNDS_ADDRESS as `0x${string}` | undefined) ??
  "0x76db8a0429d19e8440e3D290F79c0613834c72a1";

// Wave 4 — PhantomMulti (address populated after deployment)
export const PHANTOM_MULTI_ADDRESS =
  (import.meta.env.VITE_PHANTOM_MULTI_ADDRESS as `0x${string}` | undefined) ??
  "0x674200f50Ee8816355dB3105d06fF799d15720F3";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

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

// Wave 4 — InEuint8 (encrypted outcome index for placeMultiBet)
export const IN_EUINT8_TYPE = {
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

// ─── PhantomRounds ABI ─────────────────────────────────────────────────────

export const PHANTOM_ROUNDS_ABI = [
  // ── View: counts & mappings ────────────────────────────────────
  {
    name: "getRoundCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "roundCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "pendingFees",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "roundBots",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "oracleSigners",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // ── View: round data ──────────────────────────────────────────
  {
    name: "getRoundCore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "asset",           type: "bytes32" },
      { name: "intervalSeconds", type: "uint32"  },
      { name: "startPrice",      type: "uint64"  },
      { name: "lockAt",          type: "uint256" },
      { name: "settleAt",        type: "uint256" },
      { name: "bettorCount",     type: "uint256" },
      { name: "creator",         type: "address" },
      { name: "status",          type: "uint8"   },
    ],
  },
  {
    name: "getRoundSettlement",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "endPrice",          type: "uint64"  },
      { name: "status",            type: "uint8"   },
      { name: "outcomeUp",         type: "bool"    },
      { name: "poolsRevealed",     type: "bool"    },
      { name: "revealedUpPool",    type: "uint64"  },
      { name: "revealedDownPool",  type: "uint64"  },
      { name: "revealedTotalPool", type: "uint64"  },
      { name: "oracleRoundId",     type: "bytes32" },
      { name: "observedAt",        type: "uint256" },
    ],
  },
  {
    name: "getRoundEth",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "totalEth",  type: "uint256" },
      { name: "userStake", type: "uint256" },
    ],
  },
  {
    name: "hasRoundBet",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "hasRoundClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "directionRevealed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "revealedDirections",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "ethStakes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns ebool handle as uint256 (viem decodes as bigint for cofheClient)
    name: "getRoundBet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns ebool handle as uint256
    name: "getRoundDirection",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns euint64 handle as uint256
    name: "getUpPool",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns euint64 handle as uint256
    name: "getDownPool",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "oracleMessageHash",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "roundId",    type: "uint256" },
      { name: "endPrice",   type: "uint64"  },
      { name: "observedAt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // ── Writes: lifecycle ─────────────────────────────────────────
  {
    name: "createRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset",           type: "bytes32" },
      { name: "intervalSeconds", type: "uint32"  },
      { name: "startPrice",      type: "uint64"  },
      { name: "lockAt",          type: "uint256" },
      { name: "settleAt",        type: "uint256" },
      { name: "oracleRoundId",   type: "bytes32" },
    ],
    outputs: [{ name: "roundId", type: "uint256" }],
  },
  {
    // ETH stake is msg.value; only direction is FHE-encrypted (CoFHE SDK required)
    name: "placeRoundBet",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "roundId",        type: "uint256"    },
      { name: "encDirectionUp", ...IN_EBOOL_TYPE   },
    ],
    outputs: [],
  },
  {
    // Plain bool direction — trivially encrypted on-chain. Works without CoFHE SDK.
    name: "placeRoundBetSimple",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "isUp",    type: "bool"    },
    ],
    outputs: [],
  },
  {
    name: "lockRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "resolveRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId",         type: "uint256" },
      { name: "endPrice",        type: "uint64"  },
      { name: "observedAt",      type: "uint256" },
      { name: "oracleSignature", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    // SOL path — keeper encrypts price client-side; FHE.gte runs on ciphertext
    name: "resolveRoundEncrypted",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId",      type: "uint256"    },
      { name: "encEndPrice",  ...IN_EUINT64_TYPE  },
    ],
    outputs: [],
  },
  {
    // Called by keeper after CoFHE threshold decryption for PENDING_REVEAL rounds
    name: "revealRoundOutcome",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId",    type: "uint256" },
      { name: "outcomeUp",  type: "bool"    },
      { name: "endPrice",   type: "uint64"  },
      { name: "outcomeSig", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    // Actual contract: (roundId, upPlaintext, upSig, downPlaintext, downSig)
    name: "revealRoundPools",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId",      type: "uint256" },
      { name: "upPlaintext",  type: "uint64"  },
      { name: "upSig",        type: "bytes"   },
      { name: "downPlaintext",type: "uint64"  },
      { name: "downSig",      type: "bytes"   },
    ],
    outputs: [],
  },
  {
    // User calls with CoFHE threshold sig to prove their encrypted direction
    name: "revealMyDirection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId",     type: "uint256" },
      { name: "directionUp", type: "bool"    },
      { name: "sig",         type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "claimRoundPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "refundCanceledRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "reason",  type: "string"  },
    ],
    outputs: [],
  },
  // ── Writes: admin ──────────────────────────────────────────────
  {
    name: "setRoundBot",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bot",     type: "address" },
      { name: "allowed", type: "bool"    },
    ],
    outputs: [],
  },
  {
    name: "setOracleSigner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "signer",  type: "address" },
      { name: "allowed", type: "bool"    },
    ],
    outputs: [],
  },
  {
    name: "setPaused",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "bool" }],
    outputs: [],
  },
  {
    name: "withdrawFees",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
  // ── Events ─────────────────────────────────────────────────────
  {
    name: "RoundCreated",
    type: "event",
    inputs: [
      { name: "roundId",         type: "uint256", indexed: true  },
      { name: "asset",           type: "bytes32", indexed: true  },
      { name: "intervalSeconds", type: "uint32",  indexed: false },
      { name: "startPrice",      type: "uint64",  indexed: false },
      { name: "lockAt",          type: "uint256", indexed: false },
      { name: "settleAt",        type: "uint256", indexed: false },
      { name: "oracleRoundId",   type: "bytes32", indexed: false },
      { name: "creator",         type: "address", indexed: false },
    ],
  },
  {
    name: "RoundBetPlaced",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "bettor",  type: "address", indexed: true },
      { name: "ethStake",type: "uint256", indexed: false },
    ],
  },
  {
    name: "RoundLocked",
    type: "event",
    inputs: [{ name: "roundId", type: "uint256", indexed: true }],
  },
  {
    name: "RoundResolved",
    type: "event",
    inputs: [
      { name: "roundId",    type: "uint256", indexed: true  },
      { name: "outcomeUp",  type: "bool",    indexed: false },
      { name: "startPrice", type: "uint64",  indexed: false },
      { name: "endPrice",   type: "uint64",  indexed: false },
      { name: "observedAt", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RoundPendingReveal",
    type: "event",
    inputs: [{ name: "roundId", type: "uint256", indexed: true }],
  },
  {
    name: "RoundOutcomeRevealed",
    type: "event",
    inputs: [
      { name: "roundId",   type: "uint256", indexed: true  },
      { name: "outcomeUp", type: "bool",    indexed: false },
      { name: "endPrice",  type: "uint64",  indexed: false },
    ],
  },
  {
    name: "RoundPoolsRevealed",
    type: "event",
    inputs: [
      { name: "roundId",   type: "uint256", indexed: true  },
      { name: "upPool",    type: "uint64",  indexed: false },
      { name: "downPool",  type: "uint64",  indexed: false },
      { name: "totalPool", type: "uint64",  indexed: false },
    ],
  },
  {
    name: "RoundPayoutClaimed",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "bettor",  type: "address", indexed: true },
      { name: "amount",  type: "uint256", indexed: false },
    ],
  },
  {
    name: "DirectionRevealed",
    type: "event",
    inputs: [
      { name: "roundId",     type: "uint256", indexed: true  },
      { name: "bettor",      type: "address", indexed: true  },
      { name: "directionUp", type: "bool",    indexed: false },
    ],
  },
  {
    name: "RoundCanceled",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true  },
      { name: "reason",  type: "string",  indexed: false },
    ],
  },
  {
    name: "FeesWithdrawn",
    type: "event",
    inputs: [
      { name: "to",     type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── PhantomMulti ABI (Wave 4 — multi-outcome encrypted markets) ──────────

export const PHANTOM_MULTI_ABI = [
  // ── View: market info ──────────────────────────────────────────
  {
    name: "getMultiMarketCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "marketCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMultiMarketInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [
      { name: "question",       type: "string"  },
      { name: "outcomeCount",   type: "uint8"   },
      { name: "deadline",       type: "uint256" },
      { name: "resolutionTime", type: "uint256" },
      { name: "winningOutcome", type: "uint8"   },
      { name: "resolved",       type: "bool"    },
      { name: "poolsRevealed",  type: "bool"    },
      { name: "canceled",       type: "bool"    },
      { name: "creator",        type: "address" },
      { name: "status",         type: "uint8"   },
    ],
  },
  {
    name: "getRevealedPools",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [
      { name: "pools",     type: "uint64[8]" },
      { name: "totalPool", type: "uint64"    },
    ],
  },
  {
    name: "getOutcomeLabel",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_marketId",   type: "uint256" },
      { name: "_outcomeIdx", type: "uint8"   },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getOutcomeLabels",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "string[8]" }],
  },
  {
    // Returns euint64 handle — declared as uint256 for viem/bigint compat
    name: "getMyMultiBet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns euint8 handle — declared as uint256 for viem/bigint compat
    name: "getMyBetOutcome",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Returns euint64 pool handle for a specific outcome
    name: "getEncPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_marketId",   type: "uint256" },
      { name: "_outcomeIdx", type: "uint8"   },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // AUDITOR-only: encrypted bettor count
    name: "getEncBettorCount",
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
    name: "betRevealed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_marketId", type: "uint256" },
      { name: "_user",     type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "revealedBets",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_marketId", type: "uint256" },
      { name: "_user",     type: "address" },
    ],
    outputs: [{ name: "", type: "uint64" }],
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
  {
    name: "MAX_OUTCOMES",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  // ── Writes: lifecycle ─────────────────────────────────────────
  {
    name: "createMultiMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_question",       type: "string"   },
      { name: "_labels",         type: "string[]" },
      { name: "_deadline",       type: "uint256"  },
      { name: "_resolutionTime", type: "uint256"  },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    // Simple path: outcome index is plaintext, amount is encrypted
    name: "placeMultiBetSimple",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",   type: "uint256"     },
      { name: "_outcomeIdx", type: "uint8"       },
      { name: "_encAmount",  ...IN_EUINT64_TYPE  },
    ],
    outputs: [],
  },
  {
    // Private path: both outcome index AND amount are encrypted
    name: "placeMultiBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",       type: "uint256"    },
      { name: "_encOutcomeIdx",  ...IN_EUINT8_TYPE  },
      { name: "_encAmount",      ...IN_EUINT64_TYPE },
    ],
    outputs: [],
  },
  {
    name: "resolveMultiMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",       type: "uint256" },
      { name: "_winningOutcome", type: "uint8"   },
    ],
    outputs: [],
  },
  {
    name: "revealMultiPools",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",   type: "uint256"    },
      { name: "_ctHashes",   type: "uint256[]"  },   // euint64 handles as uint256
      { name: "_plaintexts", type: "uint64[]"   },
      { name: "_signatures", type: "bytes[]"    },
    ],
    outputs: [],
  },
  {
    name: "revealMyBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId",  type: "uint256" },
      { name: "_ctHash",    type: "uint256" },   // euint64 handle as uint256
      { name: "_betAmount", type: "uint64"  },
      { name: "_signature", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "claimMultiPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelMultiMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_marketId", type: "uint256" },
      { name: "_reason",   type: "string"  },
    ],
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
    name: "MultiMarketCreated",
    type: "event",
    inputs: [
      { name: "marketId",       type: "uint256", indexed: true  },
      { name: "creator",        type: "address", indexed: true  },
      { name: "question",       type: "string",  indexed: false },
      { name: "outcomeCount",   type: "uint8",   indexed: false },
      { name: "deadline",       type: "uint256", indexed: false },
      { name: "resolutionTime", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MultiBetPlaced",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "bettor",   type: "address", indexed: true },
    ],
  },
  {
    name: "MultiMarketResolved",
    type: "event",
    inputs: [
      { name: "marketId",       type: "uint256", indexed: true  },
      { name: "winningOutcome", type: "uint8",   indexed: false },
    ],
  },
  {
    name: "MultiPoolsRevealed",
    type: "event",
    inputs: [
      { name: "marketId",  type: "uint256", indexed: true  },
      { name: "totalPool", type: "uint64",  indexed: false },
    ],
  },
  {
    name: "MultiPayoutClaimed",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "bettor",   type: "address", indexed: true  },
      { name: "amount",   type: "uint64",  indexed: false },
    ],
  },
  {
    name: "MultiBetRevealed",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "bettor",   type: "address", indexed: true  },
      { name: "amount",   type: "uint64",  indexed: false },
    ],
  },
  {
    name: "MultiMarketCanceled",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "reason",   type: "string",  indexed: false },
    ],
  },
] as const;
