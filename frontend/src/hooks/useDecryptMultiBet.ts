import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { PHANTOM_MULTI_ADDRESS, PHANTOM_MULTI_ABI } from "@/config/contracts";
import { getCofheClient } from "@/lib/fhe";
import { usePhantomMulti } from "./usePhantomMulti";

export interface DecryptedMultiBet {
  /** Bet amount in gwei */
  amount: bigint;
}

/**
 * Decrypts the caller's encrypted bet amount for a PhantomMulti market and
 * submits revealMyBet on-chain so payout can be claimed.
 *
 * Flow:
 *  1. Read getMyMultiBet (euint64 → uint256 in ABI) to get ctHash.
 *  2. Call cofheClient.decryptForView(ctHash, FheTypes.Uint64) with wallet permit.
 *  3. Call revealMyBet with (ctHash, decrypted value, CoFHE sig).
 */
export function useDecryptMultiBet(marketId: bigint) {
  const { address } = useAccount();
  const { revealMyBet } = usePhantomMulti();
  const [result, setResult] = useState<DecryptedMultiBet | null>(null);
  const [isDecrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read encrypted bet handle
  const { data: betCtHash } = useReadContract({
    address: PHANTOM_MULTI_ADDRESS,
    abi: PHANTOM_MULTI_ABI,
    functionName: "getMyMultiBet",
    args: [marketId],
    account: address,
    query: { enabled: !!address },
  });

  const decrypt = useCallback(async () => {
    if (!betCtHash) return;
    setDecrypting(true);
    setError(null);
    try {
      const client = getCofheClient();

      // FheTypes.Uint64 = 5
      const decryptResult = (await client
        .decryptForView(betCtHash as never, 5 /* Uint64 */)
        .execute()) as { value: bigint; signature: `0x${string}` };

      // If the SDK returns { value, signature }, use them for on-chain reveal
      const value = typeof decryptResult === "bigint"
        ? decryptResult
        : decryptResult.value;

      const sig: `0x${string}` = typeof decryptResult === "bigint"
        ? "0x"
        : decryptResult.signature;

      // Submit the reveal proof on-chain
      await revealMyBet(marketId, betCtHash as bigint, value, sig);

      setResult({ amount: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecrypting(false);
    }
  }, [betCtHash, marketId, revealMyBet]);

  return { decrypt, result, isDecrypting, error };
}
