/**
 * The "LoktIn" brand lockup: the logo mark followed by the wordmark.
 *
 * The icon is sized in `em`, so it scales with whatever font-size the parent
 * link/heading sets — the landing nav, the footer brand, and the dashboard nav
 * each render it at their own size without passing anything in.
 */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex justify-center items-center gap-1.5 mt-3 ${className} text-[19px] font-bold text-[#EEF0F7]`}
    >
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="h-auto w-[36.125px] shrink-0 select-none"
      />
      LoktIn
    </span>
  );
}
