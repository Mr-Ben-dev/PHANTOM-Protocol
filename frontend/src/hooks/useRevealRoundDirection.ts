import { useCallback, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
  PHANTOM_ROUNDS_ABI,
  PHANTOM_ROUNDS_ADDRESS,
} from "@/config/contracts";
import { decryptTxBool } from "@/lib/cofheDecrypt";
import { usePhantomRounds } from "./usePhantomRounds";

export interface RevealedDirection {
  directionUp: boolean;
}

/**
 * Decrypts the caller's encrypted round direction and submits revealMyDirection.
 */
export function useRevealRoundDirection(roundId: bigint) {
  const { address } = useAccount();
  const { revealMyDirection } = usePhantomRounds();
  const [result, setResult] = useState<RevealedDirection | null>(null);
  const [isRevealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: directionCtHash } = useReadContract({
    address: PHANTOM_ROUNDS_ADDRESS,
    abi: PHANTOM_ROUNDS_ABI,
    functionName: "getRoundDirection",
    args: [roundId],
    account: address,
    query: { enabled: !!address },
  });

  const reveal = useCallback(async () => {
    if (directionCtHash == null) return;
    setRevealing(true);
    setError(null);
    try {
      const { value: directionUp, signature } = await decryptTxBool(directionCtHash as bigint);
      await revealMyDirection(roundId, directionUp, signature);
      setResult({ directionUp });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [directionCtHash, roundId, revealMyDirection]);

  return { reveal, result, isRevealing, error };
}
