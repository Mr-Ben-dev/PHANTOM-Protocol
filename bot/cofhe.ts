/**
 * CoFHE client singleton for the keeper bot (Node.js).
 */
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/node";
import { chains } from "@cofhe/sdk/chains";
import type { PublicClient, WalletClient } from "viem";

const cofheConfig = createCofheConfig({
  supportedChains: [chains.arbSepolia],
});

export const cofheClient = createCofheClient(cofheConfig);

let connected = false;

export async function ensureCofheConnected(
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<void> {
  if (connected) return;
  await cofheClient.connect(publicClient as never, walletClient as never);
  connected = true;
}

export type DecryptTxResult = { value: bigint; signature: `0x${string}` };

/** Decrypt a publicly allowed handle for on-chain publishDecryptResult. */
export async function decryptPublicHandle(ctHash: bigint): Promise<DecryptTxResult> {
  const result = await cofheClient
    .decryptForTx(ctHash as never)
    .withoutPermit()
    .execute();

  if (typeof result === "bigint") {
    return { value: result, signature: "0x" };
  }

  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const value = (r.value ?? r.decryptedValue) as bigint | undefined;
    const signature = (r.signature ?? "0x") as `0x${string}`;
    if (value != null) {
      return { value, signature };
    }
  }

  throw new Error("Unexpected decryptForTx result shape");
}

/** Decrypt a user-permitted bool handle for revealMyDirection. */
export async function decryptPermittedBool(
  ctHash: bigint,
): Promise<{ directionUp: boolean; signature: `0x${string}` }> {
  const result = (await cofheClient
    .decryptForView(ctHash as never, 0 /* Bool */)
    .execute()) as boolean | { value: boolean; signature: `0x${string}` };

  if (typeof result === "boolean") {
    return { directionUp: result, signature: "0x" };
  }
  return { directionUp: result.value, signature: result.signature ?? "0x" };
}
