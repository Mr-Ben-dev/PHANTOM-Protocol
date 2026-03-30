import { useAccount, useConnect, useDisconnect, useSwitchChain, usePublicClient, useWalletClient } from "wagmi";
import { useEffect } from "react";
import { arbitrumSepolia } from "wagmi/chains";
import { connectCofhe } from "@/lib/fhe";
import { injected, metaMask } from "wagmi/connectors";

const TARGET_CHAIN = arbitrumSepolia.id;

export function useWalletAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN;

  // Auto-connect CoFHE when wallet + correct chain are ready
  useEffect(() => {
    if (!isConnected || chainId !== TARGET_CHAIN) return;
    if (!publicClient || !walletClient) return;
    connectCofhe(publicClient as never, walletClient as never).catch(console.error);
  }, [isConnected, chainId, publicClient, walletClient]);

  async function connect(useMetaMask = false) {
    const connector = useMetaMask ? metaMask() : injected();
    await connectAsync({ connector });
  }

  async function ensureRightChain() {
    if (chainId !== TARGET_CHAIN) {
      await switchChainAsync({ chainId: TARGET_CHAIN });
    }
  }

  return {
    address,
    isConnected,
    isWrongChain,
    chainId,
    connect,
    disconnect,
    ensureRightChain,
  };
}
