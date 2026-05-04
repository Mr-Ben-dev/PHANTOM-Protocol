import { useCallback } from "react";
import { getCofheClient } from "@/lib/fhe";
import { useFHEStatus, EncryptStep } from "./useFHEStatus";

/** Encrypted direction returned by encrypt() */
export interface EncryptedBet {
  encSide: {
    ctHash: bigint;
    securityZone: number;
    utype: number;
    signature: `0x${string}`;
  };
}

export function useEncryptBet() {
  const status = useFHEStatus();

  /**
   * Encrypts only the direction (UP=true / DOWN=false).
   * ETH stake is passed as msg.value — not encrypted.
   */
  const encrypt = useCallback(
    async (_amount: bigint, isUp: boolean): Promise<EncryptedBet | null> => {
      status.reset();
      try {
        status.setStep(EncryptStep.Encrypting);
        const client = getCofheClient();

        const [encSide] = await client.encryptInputs([
          { type: "bool", value: isUp },
        ] as never);

        return { encSide: encSide as never };
      } catch (err) {
        status.setError(err);
        return null;
      }
    },
    [status],
  );

  return { encrypt, ...status };
}
