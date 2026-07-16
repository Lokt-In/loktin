import { useMemo } from "react";
import type { TargetGoal } from "../hooks/useTargets";
import { goalGrowthSeries, frequencyOf } from "../lib/targetMath";
import GrowthChart from "../../../shared/dash/GrowthChart";
import { formatUsdc, formatDateShort } from "../../../shared/lib/money";

/** Projected savings of the wallet's active goals toward their targets. */
export default function GoalProjection({
  goals,
  nowSecs,
}: {
  goals: TargetGoal[];
  nowSecs: number;
}) {
  const series = useMemo(() => goalGrowthSeries(goals), [goals]);
  const active = useMemo(() => goals.filter((g) => !g.is_complete), [goals]);

  if (series.length < 2) return null;

  const savedNow = active.reduce((s, g) => s + g.deposited, 0n);
  const totalTarget = active.reduce((s, g) => s + g.target_amount, 0n);
  const to = series[series.length - 1].t;

  return (
    <GrowthChart
      title="Savings projection"
      subtitle={`${active.length} active goal${active.length === 1 ? "" : "s"} · to ${formatDateShort(to)}`}
      note="The line is the on-track schedule; the dot is what you’ve actually saved. It runs above the line when you’re ahead from a manual top-up, and below when a period is missed. The projection assumes future deposits land, so treat it as a path, not a promise."
      series={series}
      nowSecs={nowSecs}
      current={{ label: "Saved so far", value: savedNow }}
      end={{ label: `Target · ${formatDateShort(to)}`, value: totalTarget }}
      reference={{ label: "Target", value: totalTarget }}
      ariaSummary={`Savings projection for ${active.length} active goals: ${formatUsdc(savedNow)} USDC saved so far, on track for ${formatUsdc(totalTarget)} USDC by ${formatDateShort(to)}.`}
      table={
        <table className="w-full border-collapse font-body text-[12.5px]">
          <thead>
            <tr className="text-muted">
              <th className="py-2 pr-4 text-left font-semibold">Goal</th>
              <th className="py-2 pr-4 text-right font-semibold">Saved</th>
              <th className="py-2 pr-4 text-right font-semibold">Each</th>
              <th className="py-2 pr-4 text-right font-semibold">Deadline</th>
              <th className="py-2 text-right font-semibold">Target</th>
            </tr>
          </thead>
          <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
            {active.map((g) => (
              <tr key={g.id.toString()} className="border-t border-[#ffffff0a]">
                <td className="py-2 pr-4 text-subtle">
                  {g.name || `#${g.id}`}
                </td>
                <td className="py-2 pr-4 text-right text-subtle">
                  {formatUsdc(g.deposited)}
                </td>
                <td className="py-2 pr-4 text-right text-subtle">
                  {formatUsdc(g.period_amount)}/
                  {frequencyOf(g.period_seconds).toLowerCase()}
                </td>
                <td className="py-2 pr-4 text-right text-subtle">
                  {formatDateShort(g.end_date)}
                </td>
                <td className="py-2 text-right text-[#eef0f7]">
                  {formatUsdc(g.target_amount)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[#ffffff14] font-semibold">
              <td className="py-2 pr-4 text-[#eef0f7]">Total</td>
              <td className="py-2 pr-4 text-right text-[#eef0f7]">
                {formatUsdc(savedNow)}
              </td>
              <td className="py-2 pr-4" />
              <td className="py-2 pr-4" />
              <td className="py-2 text-right text-cyan">
                {formatUsdc(totalTarget)}
              </td>
            </tr>
          </tbody>
        </table>
      }
    />
  );
}
