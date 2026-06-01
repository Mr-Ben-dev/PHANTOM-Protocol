import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { PHANTOM_MULTI_ADDRESS, PHANTOM_MULTI_ABI } from "@/config/contracts";

type EncInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

async function safeGasPrice(
  publicClient: ReturnType<typeof usePublicClient>,
): Promise<bigint> {
  const price = await publicClient!.getGasPrice();
  return (price * 13n) / 10n; // +30% buffer
}

export function usePhantomMulti() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // ── createMultiMarket ─────────────────────────────────────────────────────

  const createMultiMarket = useCallback(
    async (
      question: string,
      labels: string[],
      deadline: bigint,
      resolutionTime: bigint,
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "createMultiMarket",
        args: [question, labels, deadline, resolutionTime],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── placeMultiBetSimple (primary UX path) ─────────────────────────────────

  const placeMultiBetSimple = useCallback(
    async (marketId: bigint, outcomeIdx: number, ethAmount: string) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "placeMultiBetSimple",
        args: [marketId, outcomeIdx],
        value: parseEther(ethAmount),
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── placeMultiBet (fully private path — requires CoFHE InEuint8) ──────────

  const placeMultiBet = useCallback(
    async (
      marketId: bigint,
      encOutcomeIdx: EncInput,
      encAmount: EncInput,
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "placeMultiBet",
        args: [marketId, encOutcomeIdx, encAmount],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── resolveMultiMarket ────────────────────────────────────────────────────

  const resolveMultiMarket = useCallback(
    async (marketId: bigint, winningOutcome: number) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "resolveMultiMarket",
        args: [marketId, winningOutcome],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── revealMultiPools ──────────────────────────────────────────────────────

  const revealMultiPools = useCallback(
    async (
      marketId: bigint,
      ctHashes: bigint[],
      plaintexts: bigint[],
      signatures: `0x${string}`[],
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "revealMultiPools",
        args: [marketId, ctHashes, plaintexts, signatures],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── revealMyBet ───────────────────────────────────────────────────────────

  const revealMyBet = useCallback(
    async (
      marketId: bigint,
      ctHash: bigint,
      betAmount: bigint,
      signature: `0x${string}`,
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "revealMyBet",
        args: [marketId, ctHash, betAmount, signature],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── claimMultiPayout ──────────────────────────────────────────────────────

  const revealMyChoice = useCallback(
    async (marketId: bigint, outcomeIdx: number, sig: `0x${string}`) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "revealMyChoice",
        args: [marketId, outcomeIdx, sig],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const claimMultiPayout = useCallback(
    async (marketId: bigint) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "claimMultiPayout",
        args: [marketId],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── cancelMultiMarket ─────────────────────────────────────────────────────

  const cancelMultiMarket = useCallback(
    async (marketId: bigint, reason: string) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_MULTI_ADDRESS,
        abi: PHANTOM_MULTI_ABI,
        functionName: "cancelMultiMarket",
        args: [marketId, reason],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  return {
    createMultiMarket,
    placeMultiBetSimple,
    placeMultiBet,
    resolveMultiMarket,
    revealMultiPools,
    revealMyBet,
    revealMyChoice,
    claimMultiPayout,
    cancelMultiMarket,
  };
}
