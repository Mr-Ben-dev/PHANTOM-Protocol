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
  if (walletClient === _lastWallet) return; // nothing changed
  await cofheClient.connect(publicClient as never, walletClient as never);
  _lastWallet = walletClient;
}

export function getCofheClient() {
  return cofheClient;
}
