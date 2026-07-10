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
