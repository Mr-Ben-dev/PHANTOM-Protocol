import { useCallback, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PHANTOM_BET_ABI, PHANTOM_BET_ADDRESS } from "@/config/contracts";
import { decryptTxBool } from "@/lib/cofheDecrypt";
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
      const { value: isYes, signature } = await decryptTxBool(sideCtHash as bigint);
      await revealMySide(marketId, isYes, signature);
      setResult({ isYes });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [sideCtHash, marketId, revealMySide]);

  return { reveal, result, isRevealing, error };
}
