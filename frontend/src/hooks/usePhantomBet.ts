import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { PHANTOM_BET_ADDRESS, PHANTOM_BET_ABI } from "@/config/contracts";

/**
 * Reads the current gas price from the node and adds a 30% buffer.
 * Uses legacy `gasPrice` (not EIP-1559 maxFeePerGas) because Arbitrum's
 * EIP-1559 fee oracle can return stale values slightly below the current
 * baseFee, causing "max fee per gas less than block base fee" reverts.
 */
async function safeGasPrice(
  publicClient: ReturnType<typeof usePublicClient>,
): Promise<bigint> {
  const price = await publicClient!.getGasPrice();
  return (price * 13n) / 10n; // +30 % buffer
}

export function usePhantomBet() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // ── createMarket ──────────────────────────────────────────────────────────
  const createMarket = useCallback(
    async (question: string, deadline: bigint, resolutionTime: bigint) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "createMarket",
        args: [question, deadline, resolutionTime],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── placeBet ──────────────────────────────────────────────────────────────
  const placeBet = useCallback(
    async (
      marketId: bigint,
      encAmount: {
        ctHash: bigint;
        securityZone: number;
        utype: number;
        signature: `0x${string}`;
      },
      encSide: {
        ctHash: bigint;
        securityZone: number;
        utype: number;
        signature: `0x${string}`;
      },
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "placeBet",
        args: [marketId, encAmount, encSide],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── resolveMarket ─────────────────────────────────────────────────────────
  const resolveMarket = useCallback(
    async (marketId: bigint, outcome: boolean) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "resolveMarket",
        args: [marketId, outcome],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── revealPools ───────────────────────────────────────────────────────────
  const revealPools = useCallback(
    async (
      marketId: bigint,
      yesCtHash: bigint,
      yesPlaintext: bigint,
      yesSignature: `0x${string}`,
      noCtHash: bigint,
      noPlaintext: bigint,
      noSignature: `0x${string}`,
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "revealPools",
        args: [marketId, yesCtHash, yesPlaintext, noCtHash, noPlaintext, yesSignature, noSignature],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  // ── claimPayout ───────────────────────────────────────────────────────────
  const claimPayout = useCallback(
    async (marketId: bigint) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "claimPayout",
        args: [marketId],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  return { createMarket, placeBet, resolveMarket, revealPools, claimPayout };
}
