import { useCallback } from "react";
import { getCofheClient } from "@/lib/fhe";
import { useFHEStatus, EncryptStep } from "./useFHEStatus";

/** Encrypted‑bet payload returned by encryptInputs */
export interface EncryptedBet {
  encAmount: {
    ctHash: bigint;
    securityZone: number;
    utype: number;
    signature: `0x${string}`;
  };
  encSide: {
    ctHash: bigint;
    securityZone: number;
    utype: number;
    signature: `0x${string}`;
  };
}

export function useEncryptBet() {
  const status = useFHEStatus();

  const encrypt = useCallback(
    async (amount: bigint, isYes: boolean): Promise<EncryptedBet | null> => {
      status.reset();
      try {
        status.setStep(EncryptStep.Encrypting);
        const client = getCofheClient();

        // cofheClient.encryptInputs returns an array in the same order they
        // were passed. Each element is an InEuint64 / InEbool struct viem
        // can pass directly as calldata.
        const [encAmount, encSide] = await client.encryptInputs([
          { type: "uint64", value: amount },
          { type: "bool",   value: isYes  },
        ] as never);

        return { encAmount: encAmount as never, encSide: encSide as never };
      } catch (err) {
        status.setError(err);
        return null;
      }
    },
    [status],
  );

  return { encrypt, ...status };
}
