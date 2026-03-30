import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { PHANTOM_BET_ADDRESS, PHANTOM_BET_ABI } from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";

export interface DecryptedPosition {
  amount: bigint;
  isYes: boolean;
}

/**
 * Decrypts the caller's bet for a given market.
 *
 * Flow:
 *   1. Read the encrypted ctHash via getMyBet (euint64 → uint256 in ABI).
 *   2. Call cofheClient.decryptForView(ctHash, FheTypes.Uint64) with the
 *      user's wallet-signed permit.
 *   3. Repeat for getMyBetSide (ebool).
 */
export function useDecryptPosition(marketId: bigint) {
  const { address } = useAccount();
  const [result, setResult] = useState<DecryptedPosition | null>(null);
  const [isDecrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read ciphertext handles (only when wallet is connected)
  const { data: amountCtHash } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "getMyBet",
    args: [marketId],
    account: address,
    query: { enabled: !!address },
  });

  const { data: sideCtHash } = useReadContract({
    address: PHANTOM_BET_ADDRESS,
    abi: PHANTOM_BET_ABI,
    functionName: "getMyBetSide",
    args: [marketId],
    account: address,
    query: { enabled: !!address },
  });

  const decrypt = useCallback(async () => {
    if (!amountCtHash || !sideCtHash) return;
    setDecrypting(true);
    setError(null);
    try {
      const client = getCofheClient();

      // FheTypes enum: Uint64 = 5, Bool = 0 — use numeric literals so we
      // don't need an import that may change across SDK versions.
      const [amount, isYes] = await Promise.all([
        client.decryptForView(amountCtHash as never, 5 /* Uint64 */).execute() as Promise<bigint>,
        client.decryptForView(sideCtHash as never, 0 /* Bool */).execute() as Promise<boolean>,
      ]);

      setResult({ amount, isYes });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecrypting(false);
    }
  }, [amountCtHash, sideCtHash]);

  return { decrypt, result, isDecrypting, error };
}
