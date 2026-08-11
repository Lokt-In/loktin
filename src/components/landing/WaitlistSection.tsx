import { useState } from "react";
import { isValidEmail, joinWaitlist } from "../../lib/waitlist";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Waitlist capture. Email → a Google Sheet (via the Apps Script web app in
 * `lib/waitlist`). Includes a hidden honeypot field so naive bots that fill
 * every input are dropped silently.
 */
export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async () => {
    // A filled honeypot means a bot — pretend success, submit nothing.
    if (honeypot) {
      setStatus("done");
      return;
    }
    if (!isValidEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      await joinWaitlist(email);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      id="waitlist"
      className="mx-auto max-w-(--max-width) px-5 pt-24 pb-8 md:px-8 md:pt-32"
    >
      <div className="mx-auto max-w-[1104px] rounded-[26px] border border-[#ffffff14] bg-[#0e0f1a] px-6 py-16 text-center sm:px-10">
        <h2 className="font-heading text-[clamp(1.8rem,4vw,2.4rem)] font-bold tracking-tight text-[#eef0f7]">
          Be first when we launch
        </h2>
        <p className="mx-auto mt-3 max-w-[460px] font-body text-[15px] leading-relaxed text-subtle">
          Drop your email and we’ll let you know the moment new features and
          mainnet go live.
        </p>

        {status === "done" ? (
          <p className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-5 py-3 font-body text-[14.5px] font-semibold text-cyan">
            You’re on the list. We’ll be in touch. ✓
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="mx-auto mt-8 flex max-w-[520px] flex-col gap-3 sm:flex-row"
          >
            {/* Honeypot: hidden from people, tempting to bots. */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="you@example.com"
              className="h-[47px] flex-1 rounded-xl border border-[#ffffff1f] bg-[#05060a] px-4 font-body text-[14.5px] text-white placeholder:text-muted focus:border-cyan/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex h-[47px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-cyan px-6 font-body text-[14.5px] font-bold whitespace-nowrap text-[#05060a] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? "Joining…" : "Join waitlist"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 font-body text-[13px] text-red-300">
            Couldn’t add you just now — check your email and try again.
          </p>
        )}
      </div>
    </section>
  );
}
