/**
 * CoFHE client connection helper.
 *
 * Must be called once a wallet is connected and on the correct chain.
 * Idempotent — cofheClient.connect handles re-use internally.
 */
import { type PublicClient, type WalletClient } from "viem";
import { cofheClient } from "@/config/cofhe";

let _lastWallet: WalletClient | null = null;

export async function connectCofhe(
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<void> {
  if (walletClient !== _lastWallet) {
    await cofheClient.connect(publicClient as never, walletClient as never);
    _lastWallet = walletClient;
  }
  await ensureCofhePermit();
}

/** EIP-712 self-permit required before decryptForView (see cofhe-docs.fhenix.zone). */
export async function ensureCofhePermit(): Promise<void> {
  if (!cofheClient.connected) {
    throw new Error("Connect wallet on Arbitrum Sepolia before decrypting.");
  }
  await cofheClient.permits.getOrCreateSelfPermit();
}

export function getCofheClient() {
  return cofheClient;
}
