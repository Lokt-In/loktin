import Wordmark from "../../shared/components/Wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Locked In", href: "#" },
      { label: "Target Savings", href: "#" },
      // { label: "How it works", href: "#how-it-works" },
      // { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.loktin.xyz" },
      // { label: "Smart contracts", href: "#" },
      // { label: "Security", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Twitter / X", href: "#" },
      // { label: "Discord", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

const SOCIALS = [
  { name: "Twitter / X", href: "#", icon: "/landing/icons/x.png" },
  // { name: "Discord", href: "#", icon: "/landing/icons/discord.png" },
  { name: "GitHub", href: "#", icon: "/landing/icons/github.png" },
];

/**
 * Footer — brand blurb + link columns, a copyright/socials row, and the
 * oversized "LoktIn" wordmark (bold sans, hard white right-offset shadow)
 * bleeding off the bottom of the page.
 */
export default function Footer() {
  return (
    <footer className="mt-[71px]">
      <div className="overflow-hidden">
        <p
          aria-label="LoktIn"
          className="-mb-[0.42em] w-full animate-wordmark-shadow text-center font-body text-[clamp(8rem,26vw,26rem)] leading-none font-bold tracking-[0.08em] text-[#10162b] select-none motion-reduce:animate-none"
          style={{ textShadow: "7px 0 0 #ffffff" }}
        >
          LoktIn
        </p>
      </div>

      <div className="mx-auto max-w-(--max-width) px-5 md:px-8 border-t border-[#ffffff14] pt-16 pb-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <p className="font-heading text-[22px] font-bold text-white">
              <Wordmark />
            </p>
            {/* <p className="mt-4 max-w-[320px] font-body text-[14px] leading-[21.7px] text-muted">
              Savings and investment on Stellar. Smart contracts hold you to
              your own plan, so you don&apos;t have to.
            </p> */}
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-heading text-[13px] leading-[20.15px] font-bold tracking-[0.52px] text-subtle uppercase">
                {col.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="font-body text-[14px] leading-[21.7px] text-muted transition-colors hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-[#ffffff14]" />

        <div className="flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <p className="font-body text-[14px] text-muted">
            © 2026 LoktIn. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ffffff14] bg-[#ffffff0a] transition-colors hover:bg-[#ffffff14]"
              >
                <img src={s.icon} alt="" className="h-3 w-auto" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
