/**
 * PHANTOM Protocol — PhantomBet Market Metadata
 *
 * Static metadata for the 10 seeded prediction markets.
 * Keyed by market ID (0-indexed, matching creation order in seed-markets.ts).
 *
 * Images: Unsplash CDN (reliable, no auth required for display).
 * Category colours match the sidebar filter labels.
 */

export interface MarketMeta {
  image: string;
  category: "Crypto" | "Finance" | "Politics" | "Regulation" | "Tech";
  /** Short tag shown on the card */
  tag?: string;
  /** Is this a hot/trending market? */
  hot?: boolean;
  /** Is this a newly listed market? */
  isNew?: boolean;
}

/** Indexed by market ID (matches seed-markets.ts creation order) */
export const MARKET_METADATA: MarketMeta[] = [
  // 0 — "Will Bitcoin reach $150,000 by December 2026?"
  {
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=640&q=80",
    category: "Crypto",
    tag: "BTC",
    hot: true,
  },
  // 1 — "Will Ethereum break $5,000 in Q3 2026?"
  {
    image: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=640&q=80",
    category: "Crypto",
    tag: "ETH",
    hot: true,
  },
  // 2 — "Will the US Federal Reserve cut rates before August 2026?"
  {
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    category: "Finance",
    tag: "Macro",
  },
  // 3 — "Will Solana flip Ethereum by market cap before end of 2026?"
  {
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&q=80",
    category: "Crypto",
    tag: "SOL",
  },
  // 4 — "Will DeFi total TVL exceed $200B by end of 2026?"
  {
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80",
    category: "Crypto",
    tag: "DeFi",
    isNew: true,
  },
  // 5 — "Will any AI token enter the crypto top 10 by market cap in Q3 2026?"
  {
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=640&q=80",
    category: "Tech",
    tag: "AI",
    isNew: true,
  },
  // 6 — "Will Bitcoin spot ETF daily inflows exceed $1B in a single day in 2026?"
  {
    image: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=640&q=80",
    category: "Finance",
    tag: "BTC ETF",
    hot: true,
  },
  // 7 — "Will Ethereum Layer 2 total TVL surpass $100B by September 2026?"
  {
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&q=80",
    category: "Crypto",
    tag: "L2",
  },
  // 8 — "Will NVIDIA surpass Apple as the world's most valuable company by June 2026?"
  {
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    category: "Finance",
    tag: "Equities",
    hot: true,
  },
  // 9 — "Will a spot Solana ETF be approved in the United States before December 2026?"
  {
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&q=80",
    category: "Regulation",
    tag: "SOL ETF",
    isNew: true,
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Crypto:     "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Finance:    "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Politics:   "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Regulation: "text-red-400 bg-red-400/10 border-red-400/20",
  Tech:       "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

/** Get metadata for a market by its on-chain ID (safe — returns undefined if not found) */
export function getMarketMeta(id: bigint): MarketMeta | undefined {
  return MARKET_METADATA[Number(id)];
}
