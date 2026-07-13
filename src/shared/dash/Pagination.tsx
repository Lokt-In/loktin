interface Props {
  /** 1-indexed current page. */
  page: number;
  totalPages: number;
  /** Items across all pages, for the "Showing x–y of n" caption. */
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

const ARROW =
  "grid h-9 w-9 place-items-center rounded-lg border border-[#ffffff14] bg-[#101116] text-subtle transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-subtle";

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: Props) {
  if (totalPages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row"
    >
      <p className="font-body text-[13px] text-muted">
        Showing {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={ARROW}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="m14 6-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`h-9 min-w-9 rounded-lg border px-3 font-body text-[13.5px] font-semibold transition-colors ${
              n === page
                ? "border-cyan/40 bg-cyan/10 text-cyan"
                : "border-[#ffffff14] bg-[#101116] text-muted hover:text-white"
            }`}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={ARROW}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="m10 6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}
