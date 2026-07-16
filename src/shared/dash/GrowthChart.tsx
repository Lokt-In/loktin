import { useMemo, useRef, useState, type ReactNode } from "react";
import { formatUsdc, formatDateShort } from "../lib/money";

/* Fixed coordinate space; CSS scales the svg to the card width. The bottom pad
   is inside the viewBox so the x-axis labels never spill and the card can't grow
   a nested scrollbar. */
const W = 720;
const H = 260;
const PAD = { top: 18, right: 18, bottom: 34, left: 62 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const usdc = (stroops: bigint) => Number(stroops) / 1e7;

export type GrowthPoint = { t: number; value: bigint };

export type GrowthChartProps = {
  title: string;
  subtitle?: string;
  note: string;
  series: GrowthPoint[];
  nowSecs: number;
  /** Headline readout: the value "now" and its label (e.g. Today / Saved so far). */
  current: { label: string; value: bigint };
  /** Secondary readout + endpoint dot (e.g. At maturity / Target). */
  end: { label: string; value: bigint };
  /** Optional horizontal reference line, e.g. a savings target. */
  reference?: { label: string; value: bigint };
  ariaSummary: string;
  table: ReactNode;
  defaultOpen?: boolean;
};

export default function GrowthChart({
  title,
  subtitle,
  note,
  series,
  nowSecs,
  current,
  end,
  reference,
  ariaSummary,
  table,
  defaultOpen = false,
}: GrowthChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  const geom = useMemo(() => {
    if (series.length < 2) return null;
    const from = series[0].t;
    const to = series[series.length - 1].t;

    // The curve only rises, so first/last bound it — but let a reference line
    // (the target) widen the domain so it's never drawn off-card. Yield/goal
    // growth is a few percent, so a zero baseline would flatten the line; the
    // axis is truncated and every tick labelled with a real number instead.
    const vals = [usdc(series[0].value), usdc(series[series.length - 1].value)];
    if (reference) vals.push(usdc(reference.value));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = Math.max(hi - lo, 0.01);
    // Clamp at zero: a balance is never negative.
    const yMin = Math.max(0, lo - span * 0.18);
    const yMax = hi + span * 0.18;

    const x = (t: number) => PAD.left + ((t - from) / (to - from)) * PLOT_W;
    const y = (v: number) =>
      PAD.top + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H;

    return { from, to, yMin, yMax, x, y };
  }, [series, reference]);

  if (!geom || series.length < 2) return null;

  const { from, to, yMin, yMax, x, y } = geom;
  const nowClamped = Math.min(Math.max(nowSecs, from), to);
  const nowX = x(nowClamped);

  const d = `M ${series.map((p) => `${x(p.t)},${y(usdc(p.value))}`).join(" L ")}`;

  const yTicks = [
    yMin + (yMax - yMin) * 0.1,
    (yMin + yMax) / 2,
    yMax - (yMax - yMin) * 0.1,
  ];
  const xTicks = [from, Math.round((from + to) / 2), to];

  const hovered = hover !== null ? series[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    // Snap to the nearest sample — the reader aims at a date, not a 2px line.
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < series.length; i++) {
      const dx = Math.abs(x(series[i].t) - px);
      if (dx < bestD) {
        bestD = dx;
        best = i;
      }
    }
    setHover(best);
  };

  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHover((h) => {
      const cur = h ?? series.findIndex((p) => p.t >= nowClamped);
      const next = cur + (e.key === "ArrowRight" ? 1 : -1);
      return Math.min(Math.max(next, 0), series.length - 1);
    });
  };

  return (
    <section className="mt-8 rounded-2xl border border-[#ffffff14] bg-[#101116]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-heading text-[19px] font-bold text-[#eef0f7]">
            {title}
          </h2>
          {!open && (
            <span className="font-body text-[13px] text-muted">
              {formatUsdc(current.value)} USDC {current.label.toLowerCase()}
            </span>
          )}
          {open && subtitle && (
            <span className="font-body text-[12.5px] text-muted">
              {subtitle}
            </span>
          )}
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6">
          <p className="font-body text-[12.5px] leading-relaxed text-muted">
            {note}
          </p>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="mt-4 w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-cyan/50"
            role="img"
            tabIndex={0}
            aria-label={`${ariaSummary} Full figures in the table below.`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKey}
            onFocus={() => hover === null && setHover(series.length - 1)}
            onBlur={() => setHover(null)}
          >
            {/* Grid: solid hairlines, one shade off the surface. Never dashed —
                dashing is reserved for the projected segment. */}
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="#ffffff"
                  strokeOpacity={0.06}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y(v)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="font-body"
                  fill="#676d84"
                  fontSize={11}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {v.toFixed(2)}
                </text>
              </g>
            ))}

            {xTicks.map((t, i) => (
              <text
                key={t}
                x={x(t)}
                y={H - PAD.bottom + 18}
                textAnchor={
                  i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"
                }
                className="font-body"
                fill="#676d84"
                fontSize={11}
              >
                {formatDateShort(t)}
              </text>
            ))}

            {/* Target reference: solid muted horizontal, distinct from the dashed
                projection so the two don't read as the same thing. */}
            {reference && usdc(reference.value) <= yMax && (
              <>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(usdc(reference.value))}
                  y2={y(usdc(reference.value))}
                  stroke="#9aa0b4"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                />
                <text
                  x={W - PAD.right}
                  y={y(usdc(reference.value)) - 5}
                  textAnchor="end"
                  className="font-body"
                  fill="#9aa0b4"
                  fontSize={10}
                >
                  {reference.label}
                </text>
              </>
            )}

            {/* "Today" divider. Solid, muted: a threshold, not data. */}
            {nowSecs > from && nowSecs < to && (
              <>
                <line
                  x1={nowX}
                  x2={nowX}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke="#9aa0b4"
                  strokeOpacity={0.45}
                  strokeWidth={1}
                />
                <text
                  x={nowX + 5}
                  y={PAD.top + 10}
                  className="font-body"
                  fill="#9aa0b4"
                  fontSize={10}
                >
                  Today
                </text>
              </>
            )}

            {/* One line, clipped into earned-so-far (solid) and projected
                (dashed). Dashing carries its conventional meaning: not yet. */}
            <defs>
              <clipPath id="gc-past">
                <rect x={0} y={0} width={nowX} height={H} />
              </clipPath>
              <clipPath id="gc-future">
                <rect x={nowX} y={0} width={W - nowX} height={H} />
              </clipPath>
            </defs>
            <path
              d={d}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={2}
              strokeLinecap="round"
              clipPath="url(#gc-past)"
            />
            <path
              d={d}
              fill="none"
              stroke="#22d3ee"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              clipPath="url(#gc-future)"
            />

            {/* Direct labels, selectively: the two points that carry the story.
                The "now" dot marks the real current value (`current`), not the
                series — for a goal that's actual saved, so its gap from the line
                is the ahead/behind-schedule story. For a lock the two coincide. */}
            <circle
              cx={nowX}
              cy={y(Math.min(Math.max(usdc(current.value), yMin), yMax))}
              r={4}
              fill="#22d3ee"
            />
            <circle
              cx={x(to)}
              cy={y(usdc(series[series.length - 1].value))}
              r={4}
              fill="#101116"
              stroke="#22d3ee"
              strokeWidth={2}
            />

            {hovered && (
              <>
                <line
                  x1={x(hovered.t)}
                  x2={x(hovered.t)}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke="#eef0f7"
                  strokeOpacity={0.25}
                  strokeWidth={1}
                />
                <circle
                  cx={x(hovered.t)}
                  cy={y(usdc(hovered.value))}
                  r={5}
                  fill="#22d3ee"
                  stroke="#101116"
                  strokeWidth={2}
                />
              </>
            )}
          </svg>

          {/* Readout. Values lead, labels follow. Mirrors hover + keyboard,
              and the same numbers live in the table, so hover never gates. */}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <Readout
              label={hovered ? formatDateShort(hovered.t) : current.label}
              value={formatUsdc(hovered ? hovered.value : current.value)}
              accent
            />
            <Readout label={end.label} value={formatUsdc(end.value)} />
          </div>

          <details className="mt-4 border-t border-[#ffffff0a] pt-3">
            <summary className="cursor-pointer font-body text-[12.5px] text-muted hover:text-subtle">
              View as table
            </summary>
            <div className="mt-3 overflow-x-auto">{table}</div>
          </details>
        </div>
      )}
    </section>
  );
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-heading text-[20px] font-bold ${accent ? "text-cyan" : "text-[#eef0f7]"}`}
      >
        {value}{" "}
        <span className="font-body text-[12px] font-semibold text-muted">
          USDC
        </span>
      </p>
      <p className="font-body text-[11.5px] text-muted">{label}</p>
    </div>
  );
}
