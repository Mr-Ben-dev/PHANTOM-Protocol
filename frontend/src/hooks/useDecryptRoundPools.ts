import { useCallback, useState } from "react";
import { useReadContract } from "wagmi";
import {
  PHANTOM_ROUNDS_ABI,
  PHANTOM_ROUNDS_ADDRESS,
} from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
import { usePhantomRounds } from "./usePhantomRounds";

export interface RevealedRoundPools {
  upPool: bigint;
  downPool: bigint;
  totalPool: bigint;
}

/**
 * Decrypts UP/DOWN pool handles and submits revealRoundPools on-chain.
 * Callable after resolveRound (FHE.allowPublic on pool handles).
 */
export function useDecryptRoundPools(roundId: bigint) {
  const { revealRoundPools } = usePhantomRounds();
  const [isRevealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedRoundPools | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: upCtHash } = useReadContract({
    address: PHANTOM_ROUNDS_ADDRESS,
    abi: PHANTOM_ROUNDS_ABI,
    functionName: "getUpPool",
    args: [roundId],
  });

  const { data: downCtHash } = useReadContract({
    address: PHANTOM_ROUNDS_ADDRESS,
    abi: PHANTOM_ROUNDS_ABI,
    functionName: "getDownPool",
    args: [roundId],
  });

  const reveal = useCallback(async () => {
    if (upCtHash == null || downCtHash == null) return;
    setRevealing(true);
    setError(null);
    try {
      const client = getCofheClient();

      const [up, down] = await Promise.all([
        client.decryptForTx(upCtHash as never).withoutPermit().execute() as Promise<
          { value: bigint; signature: `0x${string}` }
        >,
        client.decryptForTx(downCtHash as never).withoutPermit().execute() as Promise<
          { value: bigint; signature: `0x${string}` }
        >,
      ]);

      await revealRoundPools(roundId, up.value, up.signature, down.value, down.signature);

      setRevealed({
        upPool: up.value,
        downPool: down.value,
        totalPool: up.value + down.value,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [upCtHash, downCtHash, roundId, revealRoundPools]);

  return { reveal, revealed, isRevealing, error };
}
