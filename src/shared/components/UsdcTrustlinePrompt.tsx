import { useUsdcTrustline } from "../../hooks/useUsdcTrustline";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { USDC_FAUCET_URL } from "../../lib/usdc";

// Below this, the wallet can't really do anything yet, so we keep nudging the
// user to the faucet. 5 USDC (7 decimals).
const MIN_USDC = 5n * 10_000_000n;

const BTN =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-cyan px-5 py-2.5 font-body text-[14px] font-semibold whitespace-nowrap text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Onboarding bar under the dashboard nav. Three states:
 *  1. No USDC trustline  -> add the trustline (a one-time signed tx).
 *  2. Trustline, but < 5 USDC -> point the user at the Circle faucet to fund.
 *     (This is the state right after a successful trustline add, when the
 *     balance is still 0 — the bar must NOT vanish here.)
 *  3. Funded (>= 5 USDC) -> render nothing.
 */
export default function UsdcTrustlinePrompt() {
  const { hasTrustline, submitting, error, addTrustline } = useUsdcTrustline();
  const { balance, loading: balLoading } = useUsdcBalance();

  // Trustline state not known yet — don't flash a bar.
  if (hasTrustline === null) return null;

  const needsTrustline = hasTrustline === false;
  // Only judge "low" once the balance has actually loaded, so a funded wallet
  // doesn't briefly flash the fund prompt while its balance reads back.
  const lowBalance = hasTrustline === true && !balLoading && balance < MIN_USDC;

  if (!needsTrustline && !lowBalance) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 md:px-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading text-[15.5px] font-bold text-[#eef0f7]">
            {needsTrustline
              ? "Enable USDC on your wallet"
              : "Add some test USDC to get started"}
          </h2>
          <p className="mt-1 font-body text-[13.5px] leading-relaxed text-subtle">
            {needsTrustline
              ? "Add a one-time USDC trustline so your wallet can hold and save USDC. It needs a little XLM for the fee — use “Get test XLM” in the wallet menu first."
              : "Your balance is low. Grab free test USDC from the Circle faucet (choose Stellar and paste your wallet address), and it’ll show up here."}
          </p>
          {needsTrustline && error && (
            <p className="mt-2 font-body text-[12.5px] text-red-300">{error}</p>
          )}
        </div>

        {needsTrustline ? (
          <button
            type="button"
            onClick={() => void addTrustline()}
            disabled={submitting}
            className={BTN}
          >
            {submitting ? "Adding…" : "Add USDC trustline"}
          </button>
        ) : (
          <a
            href={USDC_FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN}
          >
            Get test USDC →
          </a>
        )}
      </div>
    </div>
  );
}
