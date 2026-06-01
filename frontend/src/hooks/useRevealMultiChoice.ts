import { useCallback, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PHANTOM_MULTI_ABI, PHANTOM_MULTI_ADDRESS } from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
import { usePhantomMulti } from "./usePhantomMulti";

export function useRevealMultiChoice(marketId: bigint) {
  const { address } = useAccount();
  const { revealMyChoice } = usePhantomMulti();
  const [result, setResult] = useState<number | null>(null);
  const [isRevealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: choiceCtHash } = useReadContract({
    address: PHANTOM_MULTI_ADDRESS,
    abi: PHANTOM_MULTI_ABI,
    functionName: "getMyBetOutcome",
    args: [marketId],
    account: address,
    query: { enabled: !!address },
  });

  const reveal = useCallback(async () => {
    if (choiceCtHash == null) return;
    setRevealing(true);
    setError(null);
    try {
      const client = getCofheClient();
      const decryptResult = (await client
        .decryptForView(choiceCtHash as never, 2)
        .execute()) as number | { value: number; signature: `0x${string}` };

      const outcomeIdx =
        typeof decryptResult === "number" ? decryptResult : decryptResult.value;
      const sig: `0x${string}` =
        typeof decryptResult === "number" ? "0x" : decryptResult.signature;

      await revealMyChoice(marketId, outcomeIdx, sig);
      setResult(outcomeIdx);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealing(false);
    }
  }, [choiceCtHash, marketId, revealMyChoice]);

  return { reveal, result, isRevealing, error };
}
