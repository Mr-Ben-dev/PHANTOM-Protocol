import { useCallback } from "react";
import { stringToHex } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import {
  PHANTOM_ROUNDS_ABI,
  PHANTOM_ROUNDS_ADDRESS,
  ZERO_ADDRESS,
} from "@/config/contracts";

async function safeGasPrice(
  publicClient: ReturnType<typeof usePublicClient>,
): Promise<bigint> {
  const price = await publicClient!.getGasPrice();
  return (price * 13n) / 10n;
}

function ensureRoundsConfigured() {
  if (PHANTOM_ROUNDS_ADDRESS === ZERO_ADDRESS) {
    throw new Error("PhantomRounds address not configured — deploy the contract first");
  }
}

export function encodeRoundLabel(value: string) {
  return stringToHex(value.slice(0, 31), { size: 32 });
}

export type InEbool = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export type InEuint64 = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export function usePhantomRounds() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // ── Operator functions ────────────────────────────────────────────────────

  const createRound = useCallback(
    async (
      asset: string,
      intervalSeconds: number,
      startPrice: bigint,
      lockAt: bigint,
      settleAt: bigint,
      oracleRoundId: string,
    ) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "createRound",
        args: [
          encodeRoundLabel(asset),
          intervalSeconds,
          startPrice,
          lockAt,
          settleAt,
          encodeRoundLabel(oracleRoundId),
        ],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  /**
   * Place a bet. ETH stake comes from `ethAmount` (in wei) via msg.value.
   * Only the direction (UP=true / DOWN=false) is FHE-encrypted.
   */
  const placeRoundBet = useCallback(
    async (
      roundId: bigint,
      encDirectionUp: InEbool,
      ethAmount: bigint,
    ) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "placeRoundBet",
        args: [roundId, encDirectionUp],
        value: ethAmount,
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const lockRound = useCallback(
    async (roundId: bigint) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "lockRound",
        args: [roundId],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const resolveRound = useCallback(
    async (
      roundId: bigint,
      endPrice: bigint,
      observedAt: bigint,
      oracleSignature: `0x${string}`,
    ) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "resolveRound",
        args: [roundId, endPrice, observedAt, oracleSignature],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  /** SOL oracle path — keeper encrypts price as InEuint64 */
  const resolveRoundEncrypted = useCallback(
    async (roundId: bigint, encEndPrice: InEuint64) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "resolveRoundEncrypted",
        args: [roundId, encEndPrice],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  /** Keeper calls after CoFHE threshold decryption for PENDING_REVEAL rounds */
  const revealRoundOutcome = useCallback(
    async (
      roundId: bigint,
      outcomeUp: boolean,
      endPrice: bigint,
      outcomeSig: `0x${string}`,
    ) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "revealRoundOutcome",
        args: [roundId, outcomeUp, endPrice, outcomeSig],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  /** Reveal encrypted pool totals after CoFHE threshold decryption */
  const revealRoundPools = useCallback(
    async (
      roundId: bigint,
      upPlaintext: bigint,
      upSig: `0x${string}`,
      downPlaintext: bigint,
      downSig: `0x${string}`,
    ) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "revealRoundPools",
        args: [roundId, upPlaintext, upSig, downPlaintext, downSig],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  /** User reveals their FHE-encrypted direction using CoFHE threshold signature */
  const revealMyDirection = useCallback(
    async (
      roundId: bigint,
      directionUp: boolean,
      sig: `0x${string}`,
    ) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "revealMyDirection",
        args: [roundId, directionUp, sig],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const claimRoundPayout = useCallback(
    async (roundId: bigint) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "claimRoundPayout",
        args: [roundId],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const refundCanceledRound = useCallback(
    async (roundId: bigint) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "refundCanceledRound",
        args: [roundId],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const cancelRound = useCallback(
    async (roundId: bigint, reason: string) => {
      ensureRoundsConfigured();
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_ROUNDS_ADDRESS,
        abi: PHANTOM_ROUNDS_ABI,
        functionName: "cancelRound",
        args: [roundId, reason],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  return {
    createRound,
    placeRoundBet,
    lockRound,
    resolveRound,
    resolveRoundEncrypted,
    revealRoundOutcome,
    revealRoundPools,
    revealMyDirection,
    claimRoundPayout,
    refundCanceledRound,
    cancelRound,
  };
}
