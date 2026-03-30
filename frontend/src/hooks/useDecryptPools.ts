import { useCallback, useState } from "react";
import { useReadContract } from "wagmi";
import { PHANTOM_BET_ADDRESS, PHANTOM_BET_ABI } from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
import { usePhantomBet } from "./usePhantomBet";

export interface RevealedPools {
  yesPool: bigint;
  noPool: bigint;
  totalPool: bigint;
}

/**
 * Decrypts both encrypted pool handles and then submits the revealPools
 * transaction so the results are stored on‑chain.
 *
 * Only the market creator (resolver role) should call this.
 */
export function useDecryptPools(marketId: bigint) {
  const { revealPools } = usePhantomBet();
  const [isRevealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedPools | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: yesCtHash } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "getYesPool",
    args: [marketId],
  });

  const { data: noCtHash } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "getNoPool",
    args: [marketId],
  });

  const reveal = useCallback(async () => {
    if (!yesCtHash || !noCtHash) return;
    setRevealing(true);
    setError(null);
    try {
      const client = getCofheClient();

      // decryptForTx does not require a user permit — the contract already
      // called FHE.allowPublic on these handles in resolveMarket.
      const [yesPool, noPool] = await Promise.all([
        client.decryptForTx(yesCtHash as never).withoutPermit().execute() as Promise<bigint>,
        client.decryptForTx(noCtHash as never).withoutPermit().execute() as Promise<bigint>,
      ]);

      // The SDK returns { value, signature } tuples for on-chain submission
      const yes = yesPool as unknown as { value: bigint; signature: `0x${string}` };
      const no  = noPool  as unknown as { value: bigint; signature: `0x${string}` };

      await revealPools(
        marketId,
        yesCtHash as bigint,
        yes.value,
        yes.signature,
        noCtHash as bigint,
        no.value,
        no.signature,
      );

      setRevealed({
        yesPool: yes.value,
        noPool: no.value,
        totalPool: yes.value + no.value,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [yesCtHash, noCtHash, marketId, revealPools]);

  return { reveal, revealed, isRevealing, error };
}
