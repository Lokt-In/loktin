/** USDC (and the contracts' i128 amounts) carry 7 decimals. */
export const STROOPS = 10_000_000n;

/** Parse a user-typed USDC amount ("150.25") into stroops. Returns 0n if invalid. */
export function parseUsdc(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "" || trimmed === ".")
    return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = frac.slice(0, 7).padEnd(7, "0");
  return BigInt(whole || "0") * STROOPS + BigInt(fracPadded || "0");
}

/**
 * Format stroops as a fixed-decimal USDC string. Truncates rather than rounds,
 * so a displayed balance never claims more than the chain holds.
 */
export function formatUsdc(stroops: bigint, decimals = 2): string {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const whole = abs / STROOPS;
  const frac = abs % STROOPS;
  const fracStr = frac.toString().padStart(7, "0").slice(0, decimals);
  const wholeStr = whole.toLocaleString("en-US");
  const body = decimals > 0 ? `${wholeStr}.${fracStr}` : wholeStr;
  return negative ? `-${body}` : body;
}

/**
 * Format stroops, widening past 2dp when a small amount would otherwise read as
 * "0.00". USDC carries 7 decimals, so a real 0.0002 deposit renders as 0.00 at
 * the usual precision and looks like it never landed. Trailing zeros are
 * trimmed, and one decimal place is always kept.
 */
export function formatUsdcAdaptive(stroops: bigint): string {
  const abs = stroops < 0n ? -stroops : stroops;
  if (abs === 0n) return "0.00";
  // >= 0.01 USDC survives 2dp with a non-zero digit.
  if (abs >= 100_000n) return formatUsdc(stroops, 2);
  const wide = formatUsdc(stroops, 7).replace(/0+$/, "");
  return wide.endsWith(".") ? `${wide}0` : wide;
}

export function formatDate(unixSecs: bigint | number): string {
  return new Date(Number(unixSecs) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(unixSecs: bigint | number): string {
  return new Date(Number(unixSecs) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
