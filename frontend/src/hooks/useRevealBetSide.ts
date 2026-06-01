import { useCallback, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PHANTOM_BET_ABI, PHANTOM_BET_ADDRESS } from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
import { usePhantomBet } from "./usePhantomBet";

export interface RevealedSide {
  isYes: boolean;
}

export function useRevealBetSide(marketId: bigint) {
  const { address } = useAccount();
  const { revealMySide } = usePhantomBet();
  const [result, setResult] = useState<RevealedSide | null>(null);
  const [isRevealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: sideCtHash } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "getMyBetSide",
    args: [marketId],
    account: address,
    query: { enabled: !!address },
  });

  const reveal = useCallback(async () => {
    if (sideCtHash == null) return;
    setRevealing(true);
    setError(null);
    try {
      const client = getCofheClient();
      const decryptResult = (await client
        .decryptForView(sideCtHash as never, 0)
        .execute()) as boolean | { value: boolean; signature: `0x${string}` };

      const isYes =
        typeof decryptResult === "boolean" ? decryptResult : decryptResult.value;
      const sig: `0x${string}` =
        typeof decryptResult === "boolean" ? "0x" : decryptResult.signature;

      await revealMySide(marketId, isYes, sig);
      setResult({ isYes });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [sideCtHash, marketId, revealMySide]);

  return { reveal, result, isRevealing, error };
}
