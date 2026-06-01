import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { PHANTOM_MULTI_ADDRESS, PHANTOM_MULTI_ABI } from "@/config/contracts";
import { decryptViewUint64 } from "@/lib/cofheDecrypt";
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
      const value = await decryptViewUint64(betCtHash as bigint);
      await revealMyBet(marketId, betCtHash as bigint, value, "0x");

      setResult({ amount: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecrypting(false);
    }
  }, [betCtHash, marketId, revealMyBet]);

  return { decrypt, result, isDecrypting, error };
}
