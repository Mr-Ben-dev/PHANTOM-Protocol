import { Lock, ShieldCheck } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Market } from "@/hooks/useMarkets";

const poolChartConfig = {
  yes: { label: "YES", color: "hsl(142 76% 56%)" },
  no: { label: "NO", color: "hsl(0 72% 58%)" },
  sealed: { label: "Encrypted", color: "hsl(121 95% 76% / 0.35)" },
} satisfies ChartConfig;

const barChartConfig = {
  eth: { label: "ETH", color: "hsl(121 95% 76%)" },
} satisfies ChartConfig;

function gweiToEth(gwei: bigint): number {
  return Number(gwei) / 1e9;
}

function gweiToEthStr(gwei: bigint): string {
  return gweiToEth(gwei).toFixed(4);
}

export function MarketCharts({ market }: { market: Market }) {
  const revealed = market.poolsRevealed && market.revealedTotalPool > 0n;
  const yesEth = gweiToEth(market.revealedYesPool);
  const noEth = gweiToEth(market.revealedNoPool);
  const totalEth = gweiToEth(market.revealedTotalPool);
  const yesPct = revealed ? Math.round((yesEth / totalEth) * 100) : 50;

  const pieData = revealed
    ? [
        { key: "yes", name: "YES", value: yesEth, fill: "var(--color-yes)" },
        { key: "no", name: "NO", value: noEth, fill: "var(--color-no)" },
      ]
    : [
        { key: "sealed", name: "YES (sealed)", value: 50, fill: "var(--color-sealed)" },
        { key: "sealed2", name: "NO (sealed)", value: 50, fill: "hsl(0 72% 58% / 0.25)" },
      ];

  const barData = revealed
    ? [
        { side: "YES", eth: yesEth, fill: "hsl(142 76% 56%)" },
        { side: "NO", eth: noEth, fill: "hsl(0 72% 58%)" },
      ]
    : market.totalEth > 0n
      ? [{ side: "Staked", eth: Number(market.totalEth) / 1e18, fill: "hsl(121 95% 76%)" }]
      : [{ side: "Pool", eth: 0, fill: "hsl(121 95% 76% / 0.3)" }];

  return (
    <div className="space-y-4">
      {/* Probability donut */}
      <div className="liquid-glass rounded-2xl border border-border/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              {revealed ? "Implied Probability" : "Pool Distribution"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {revealed ? "From on-chain revealed pools" : "Amounts hidden until resolution"}
            </p>
          </div>
          {revealed ? (
            <span className="text-2xl font-semibold font-mono text-emerald-400">{yesPct}% YES</span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono text-primary">
              <Lock className="w-3.5 h-3.5" /> FHE Sealed
            </span>
          )}
        </div>

        <div className="relative">
          <ChartContainer config={poolChartConfig} className="mx-auto aspect-square max-h-[240px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={revealed ? 62 : 58}
                outerRadius={92}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          {!revealed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <ShieldCheck className="w-8 h-8 text-primary/60 mb-1" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                CoFHE Encrypted
              </span>
            </div>
          )}
        </div>

        {revealed && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
              <p className="text-[10px] font-mono text-emerald-400/80 uppercase">YES Pool</p>
              <p className="text-lg font-semibold font-mono text-emerald-400">{gweiToEthStr(market.revealedYesPool)} ETH</p>
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
              <p className="text-[10px] font-mono text-red-400/80 uppercase">NO Pool</p>
              <p className="text-lg font-semibold font-mono text-red-400">{gweiToEthStr(market.revealedNoPool)} ETH</p>
            </div>
          </div>
        )}
      </div>

      {/* ETH bar chart */}
      <div className="liquid-glass rounded-2xl border border-border/20 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-4">
          {revealed ? "Pool Liquidity (ETH)" : "Total Staked (ETH)"}
        </p>
        <ChartContainer config={barChartConfig} className="aspect-[2/1] max-h-[200px] w-full">
          <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="side" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${v}`} />
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={(value) => [`${Number(value).toFixed(4)} ETH`, ""]} />
              }
            />
            <Bar dataKey="eth" radius={[6, 6, 0, 0]}>
              {barData.map((entry) => (
                <Cell key={entry.side} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className="text-[10px] font-mono text-muted-foreground text-right mt-2">
          {revealed
            ? `Total pool: ${totalEth.toFixed(4)} ETH`
            : market.totalEth > 0n
              ? `Total staked: ${(Number(market.totalEth) / 1e18).toFixed(4)} ETH (side split encrypted)`
              : "No bets placed yet"}
        </p>
      </div>
    </div>
  );
}
