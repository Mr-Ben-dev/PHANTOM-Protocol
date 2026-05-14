import { useCallback, useState } from "react";
import { useReadContract } from "wagmi";
import { PHANTOM_MULTI_ADDRESS, PHANTOM_MULTI_ABI } from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
import { usePhantomMulti } from "./usePhantomMulti";

export interface RevealedMultiPools {
  pools: bigint[];
  totalPool: bigint;
}

/**
 * Decrypts all encrypted pool handles for a PhantomMulti market and
 * submits revealMultiPools on-chain.
 *
 * Only callable after resolveMultiMarket (FHE.allowPublic has been called).
 * Fetches N pool handles, decrypts all in parallel, then submits in one tx.
 */
export function useDecryptMultiPools(marketId: bigint, outcomeCount: number) {
  const { revealMultiPools } = usePhantomMulti();
  const [isRevealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedMultiPools | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch encrypted pool handles for each outcome (up to MAX_OUTCOMES=8)
  const poolContracts = Array.from({ length: outcomeCount }, (_, i) => ({
    address: PHANTOM_MULTI_ADDRESS,
    abi: PHANTOM_MULTI_ABI,
    functionName: "getEncPool" as const,
    args: [marketId, i] as const,
  }));

  // Read all handles in parallel
  const handles: (bigint | undefined)[] = Array.from({ length: outcomeCount }, (_, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useReadContract({
      address: PHANTOM_MULTI_ADDRESS,
      abi: PHANTOM_MULTI_ABI,
      functionName: "getEncPool",
      args: [marketId, i],
    });
    return data as bigint | undefined;
  });

  const reveal = useCallback(async () => {
    if (handles.some((h) => h == null)) return;
    setRevealing(true);
    setError(null);
    try {
      const client = getCofheClient();

      // Decrypt all pool handles in parallel — they're publicly decryptable
      const decrypted = await Promise.all(
        handles.map((h) =>
          client
            .decryptForTx(h as never)
            .withoutPermit()
            .execute() as Promise<{ value: bigint; signature: `0x${string}` }>,
        ),
      );

      const ctHashes = handles as bigint[];
      const plaintexts = decrypted.map((d) => d.value);
      const signatures = decrypted.map((d) => d.signature);

      await revealMultiPools(marketId, ctHashes, plaintexts, signatures);

      const total = plaintexts.reduce((acc, v) => acc + v, 0n);
      setRevealed({ pools: plaintexts, totalPool: total });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [handles, marketId, revealMultiPools]);

  return { reveal, revealed, isRevealing, error };
}
