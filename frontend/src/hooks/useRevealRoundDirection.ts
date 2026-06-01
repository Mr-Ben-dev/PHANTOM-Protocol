import { useCallback, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
  PHANTOM_ROUNDS_ABI,
  PHANTOM_ROUNDS_ADDRESS,
} from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
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
      const client = getCofheClient();

      const decryptResult = (await client
        .decryptForView(directionCtHash as never, 0 /* Bool */)
        .execute()) as boolean | { value: boolean; signature: `0x${string}` };

      const directionUp =
        typeof decryptResult === "boolean" ? decryptResult : decryptResult.value;
      const sig: `0x${string}` =
        typeof decryptResult === "boolean" ? "0x" : decryptResult.signature;

      await revealMyDirection(roundId, directionUp, sig);
      setResult({ directionUp });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [directionCtHash, roundId, revealMyDirection]);

  return { reveal, result, isRevealing, error };
}
