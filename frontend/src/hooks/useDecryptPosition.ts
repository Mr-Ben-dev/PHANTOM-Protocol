import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { PHANTOM_BET_ADDRESS, PHANTOM_BET_ABI } from "@/config/contracts";
import { ensureCofhePermit } from "@/lib/fhe";
import { decryptViewBool, decryptViewUint64 } from "@/lib/cofheDecrypt";

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
      await ensureCofhePermit();
      const [amount, isYes] = await Promise.all([
        decryptViewUint64(amountCtHash as bigint),
        decryptViewBool(sideCtHash as bigint),
      ]);
      setResult({ amount, isYes });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecrypting(false);
    }
  }, [amountCtHash, sideCtHash]);

  const hide = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { decrypt, hide, result, isDecrypting, error };
}
