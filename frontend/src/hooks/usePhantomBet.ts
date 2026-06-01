import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { PHANTOM_BET_ADDRESS, PHANTOM_BET_ABI } from "@/config/contracts";

async function safeGasPrice(
  publicClient: ReturnType<typeof usePublicClient>,
): Promise<bigint> {
  const price = await publicClient!.getGasPrice();
  return (price * 13n) / 10n;
}

export function usePhantomBet() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

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

  const placeBetSimple = useCallback(
    async (marketId: bigint, isYes: boolean, ethAmount: string) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "placeBetSimple",
        args: [marketId, isYes],
        value: parseEther(ethAmount),
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

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
      ethAmount: string,
    ) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "placeBet",
        args: [marketId, encAmount, encSide],
        value: parseEther(ethAmount),
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

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
        args: [marketId, yesCtHash, yesPlaintext, yesSignature, noCtHash, noPlaintext, noSignature],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

  const revealMySide = useCallback(
    async (marketId: bigint, isYes: boolean, sig: `0x${string}`) => {
      const gasPrice = await safeGasPrice(publicClient);
      return writeContractAsync({
        address: PHANTOM_BET_ADDRESS,
        abi: PHANTOM_BET_ABI,
        functionName: "revealMySide",
        args: [marketId, isYes, sig],
        gasPrice,
      });
    },
    [writeContractAsync, publicClient],
  );

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

  return {
    createMarket,
    placeBetSimple,
    placeBet,
    resolveMarket,
    revealPools,
    revealMySide,
    claimPayout,
  };
}
