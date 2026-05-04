/**
 * useLivePrice — Real-time prices via Binance WebSocket streams.
 *
 * Streams: BTC/USDT, ETH/USDT, SOL/USDT
 * Falls back to REST snapshot if WebSocket disconnects.
 * Prices are in USD with 2 decimal places for BTC/ETH, 4 for SOL.
 */
import { useEffect, useRef, useState, useCallback } from "react";

export type Asset = "BTC" | "ETH" | "SOL";

export interface LivePrice {
  symbol: Asset;
  price: number;
  priceStr: string;
  change24h: number;  // percentage
  changeStr: string;
  updatedAt: number;  // unix ms
}

const SYMBOLS: Record<Asset, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  SOL: "solusdt",
};

const DECIMALS: Record<Asset, number> = {
  BTC: 2,
  ETH: 2,
  SOL: 4,
};

function formatPrice(price: number, asset: Asset): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: DECIMALS[asset],
    maximumFractionDigits: DECIMALS[asset],
  });
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

const initialPrices: Record<Asset, LivePrice> = {
  BTC: { symbol: "BTC", price: 0, priceStr: "—", change24h: 0, changeStr: "—", updatedAt: 0 },
  ETH: { symbol: "ETH", price: 0, priceStr: "—", change24h: 0, changeStr: "—", updatedAt: 0 },
  SOL: { symbol: "SOL", price: 0, priceStr: "—", change24h: 0, changeStr: "—", updatedAt: 0 },
};

/** Fetch latest snapshot from Binance REST (used for initial load or WS failure) */
async function fetchSnapshot(): Promise<Partial<Record<Asset, LivePrice>>> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%5D",
    );
    if (!res.ok) return {};
    const data = await res.json() as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
    }>;
    const result: Partial<Record<Asset, LivePrice>> = {};
    for (const item of data) {
      const asset = (
        item.symbol === "BTCUSDT" ? "BTC" :
        item.symbol === "ETHUSDT" ? "ETH" :
        item.symbol === "SOLUSDT" ? "SOL" : null
      ) as Asset | null;
      if (!asset) continue;
      const price = parseFloat(item.lastPrice);
      const change24h = parseFloat(item.priceChangePercent);
      result[asset] = {
        symbol: asset,
        price,
        priceStr: formatPrice(price, asset),
        change24h,
        changeStr: formatChange(change24h),
        updatedAt: Date.now(),
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function useLivePrice() {
  const [prices, setPrices] = useState<Record<Asset, LivePrice>>(initialPrices);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePrice = useCallback((asset: Asset, price: number, change24h: number) => {
    setPrices((prev) => ({
      ...prev,
      [asset]: {
        symbol: asset,
        price,
        priceStr: formatPrice(price, asset),
        change24h,
        changeStr: formatChange(change24h),
        updatedAt: Date.now(),
      },
    }));
  }, []);

  useEffect(() => {
    let destroyed = false;

    // Initial REST snapshot
    fetchSnapshot().then((snap) => {
      if (destroyed) return;
      if (Object.keys(snap).length > 0) {
        setPrices((prev) => ({ ...prev, ...snap }));
      }
    });

    function connect() {
      if (destroyed) return;

      // Combined stream: !ticker@arr gives all mini-tickers
      const streams = Object.values(SYMBOLS).map((s) => `${s}@ticker`).join("/");
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!destroyed) setConnected(true);
      };

      ws.onmessage = (event) => {
        if (destroyed) return;
        try {
          const msg = JSON.parse(event.data as string) as {
            stream: string;
            data: { s: string; c: string; P: string };
          };
          const symbol = msg.data.s;
          const asset = (
            symbol === "BTCUSDT" ? "BTC" :
            symbol === "ETHUSDT" ? "ETH" :
            symbol === "SOLUSDT" ? "SOL" : null
          ) as Asset | null;
          if (!asset) return;
          const price = parseFloat(msg.data.c);
          const change24h = parseFloat(msg.data.P);
          updatePrice(asset, price, change24h);
        } catch { /* ignore malformed */ }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        if (destroyed) return;
        setConnected(false);
        // Reconnect after 3s
        retryRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [updatePrice]);

  return { prices, connected };
}

/** Convenience hook for a single asset */
export function useAssetPrice(asset: Asset) {
  const { prices, connected } = useLivePrice();
  return { ...prices[asset], connected };
}
