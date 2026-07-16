import { useMemo } from "react";
import type { Lock } from "../hooks/useLocks";
import { projectedGrowthSeries, lockValueAt } from "../lib/lockMath";
import GrowthChart from "../../../shared/dash/GrowthChart";
import { formatUsdc, formatDateShort } from "../../../shared/lib/money";

/** Projected value of the wallet's active locks over their term. */
export default function ProjectedGrowth({
  locks,
  nowSecs,
}: {
  locks: Lock[];
  nowSecs: number;
}) {
  const series = useMemo(() => projectedGrowthSeries(locks), [locks]);
  const active = useMemo(() => locks.filter((l) => !l.is_unlocked), [locks]);

  if (series.length < 2) return null;

  const nowValue = active.reduce((s, l) => s + lockValueAt(l, nowSecs), 0n);
  const finalValue = series[series.length - 1].value;
  const to = series[series.length - 1].t;

  return (
    <GrowthChart
      title="Projected growth"
      subtitle={`${active.length} active lock${active.length === 1 ? "" : "s"} · to ${formatDateShort(to)}`}
      note="Value is fixed at lock time and paid in full at maturity. Locks can’t be withdrawn early, so the line is what your position is worth on paper, not a balance you can take out today."
      series={series}
      nowSecs={nowSecs}
      current={{ label: "Today", value: nowValue }}
      end={{ label: `At maturity · ${formatDateShort(to)}`, value: finalValue }}
      ariaSummary={`Projected growth of ${active.length} active locks: ${formatUsdc(nowValue)} USDC today, reaching ${formatUsdc(finalValue)} USDC by ${formatDateShort(to)}.`}
      table={
        <table className="w-full border-collapse font-body text-[12.5px]">
          <thead>
            <tr className="text-muted">
              <th className="py-2 pr-4 text-left font-semibold">Lock</th>
              <th className="py-2 pr-4 text-right font-semibold">Principal</th>
              <th className="py-2 pr-4 text-right font-semibold">Yield</th>
              <th className="py-2 pr-4 text-right font-semibold">Matures</th>
              <th className="py-2 text-right font-semibold">At maturity</th>
            </tr>
          </thead>
          <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
            {active.map((l) => (
              <tr key={l.id.toString()} className="border-t border-[#ffffff0a]">
                <td className="py-2 pr-4 text-subtle">#{l.id.toString()}</td>
                <td className="py-2 pr-4 text-right text-subtle">
                  {formatUsdc(l.amount)}
                </td>
                <td className="py-2 pr-4 text-right text-subtle">
                  +{formatUsdc(l.projected_yield)}
                </td>
                <td className="py-2 pr-4 text-right text-subtle">
                  {formatDateShort(l.end_date)}
                </td>
                <td className="py-2 text-right text-[#eef0f7]">
                  {formatUsdc(l.amount + l.projected_yield)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[#ffffff14] font-semibold">
              <td className="py-2 pr-4 text-[#eef0f7]">Total</td>
              <td className="py-2 pr-4 text-right text-[#eef0f7]">
                {formatUsdc(active.reduce((s, l) => s + l.amount, 0n))}
              </td>
              <td className="py-2 pr-4 text-right text-[#eef0f7]">
                +
                {formatUsdc(active.reduce((s, l) => s + l.projected_yield, 0n))}
              </td>
              <td className="py-2 pr-4" />
              <td className="py-2 text-right text-cyan">
                {formatUsdc(finalValue)}
              </td>
            </tr>
          </tbody>
        </table>
      }
    />
  );
}
