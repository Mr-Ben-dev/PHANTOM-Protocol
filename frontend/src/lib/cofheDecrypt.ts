import { getCofheClient, ensureCofhePermit } from "@/lib/fhe";

/** View-decrypt one handle with active CoFHE permit (user signs once per session). */
export async function decryptViewBool(ctHash: bigint | string): Promise<boolean> {
  await ensureCofhePermit();
  const client = getCofheClient();
  return client.decryptForView(ctHash as never, 0).withPermit().execute() as Promise<boolean>;
}

export async function decryptViewUint64(ctHash: bigint | string): Promise<bigint> {
  await ensureCofhePermit();
  const client = getCofheClient();
  return client.decryptForView(ctHash as never, 5).withPermit().execute() as Promise<bigint>;
}

/** On-chain reveal: CoFHE threshold signature for publishDecryptResult. */
export async function decryptTxBool(ctHash: bigint | string): Promise<{
  value: boolean;
  signature: `0x${string}`;
}> {
  await ensureCofhePermit();
  const client = getCofheClient();
  const result = await client.decryptForTx(ctHash as never).withPermit().execute();
  return {
    value: result.decryptedValue !== 0n,
    signature: result.signature,
  };
}
