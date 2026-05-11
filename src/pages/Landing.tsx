import React from "react";
import { useNavigate } from "react-router-dom";
import { connectWallet } from "../util/wallet";
import { useWallet } from "../hooks/useWallet";

// Uniform dot-grid pattern applied to every non-hero section
const DOT: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, rgba(240,244,248,0.07) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

// ── Feature cards data ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: "",
    title: "Plans",
    body: "Set up a billing plan and lock funds for it. Loktin auto-pays them on time and you earn interest on any untouched funds.",
  },
  {
    icon: "",
    title: "Target Savings",
    body: "Set your savings goal, a deadline, and a deposit cadence, and we'll debit you on schedule.",
  },
  {
    icon: "",
    title: "Locked In",
    body: "Lock up funds for a fixed term and earn interest on it. No early withdrawals.",
  },
  {
    icon: "",
    title: "Spend & Save",
    body: "Auto-route a configured percentage of every USDC spend into a savings vault.",
  },
];

const STEPS = [
  {
    n: "Plan",
    // label: "Plan",
    body: "Whether it's a billing plan, savings target, fixed lock, or auto-save on spend.",
  },
  {
    n: "Lock In",
    // label: "Lock In",
    body: "Funds are time-locked and rule-bound; discipline by design.",
  },
  {
    n: "Earn",
    // label: "Earn",
    body: "Locked funds generate yield via Blend while you wait. Idle money becomes working money.",
  },
  {
    n: "Withdraw",
    // label: "Withdraw",
    body: "Bills auto-pay. Goals mature. Locks unlock. You receive principal plus yield, on schedule.",
  },
];

// ── Main page ────────────────────────────────────────────────────────
export default function Landing() {
  const { address } = useWallet();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (address) void navigate("/dashboard");
    else void connectWallet();
  };

  return (
    <div
      style={{
        background: "var(--bg-base)",
        color: "var(--fg-primary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: "var(--nav-height)",
          borderBottom: "1px solid var(--border)",
          background: "rgba(11, 30, 30, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span
            className="lkt-wordmark"
            style={{
              fontWeight: 700,
              letterSpacing: "0.14em",
              fontSize: "var(--font-size-lg)",
            }}
          >
            LOKTIN
          </span>
          <button
            className="lkt-btn-primary"
            onClick={handleCTA}
            style={{
              background: "var(--accent-primary)",
              color: "var(--fg-primary)",
              border: "1px solid var(--accent-primary)",
              padding: "var(--sp-2) var(--sp-5)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            {address ? "OPEN APP " : "CONNECT WALLET "}
            <span className="lkt-arrow">→</span>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          paddingTop: "var(--nav-height)",
        }}
      >
        {/* (Bag images removed — to be added back later) */}

        {/* Jail bars */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "space-evenly",
            zIndex: 2,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: "100%",
                background:
                  "linear-gradient(to right, rgba(255,255,255,0.03) 0%, rgba(240,244,248,0.13) 40%, rgba(240,244,248,0.18) 50%, rgba(240,244,248,0.13) 60%, rgba(0,0,0,0.08) 100%)",
                boxShadow:
                  "2px 0 6px rgba(0,0,0,0.4), -1px 0 2px rgba(255,255,255,0.04)",
              }}
            />
          ))}
          {/* Top & bottom horizontal rails */}
          <div
            style={{
              position: "absolute",
              top: "var(--nav-height)",
              left: 0,
              right: 0,
              height: 6,
              background:
                "linear-gradient(to bottom, rgba(240,244,248,0.18), rgba(240,244,248,0.06))",
              boxShadow: "0 3px 8px rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 1,
              left: 0,
              right: 0,
              height: 6,
              background:
                "linear-gradient(to top, rgba(24,244,248,0.18), rgba(240,244,248,0.06))",
              boxShadow: "0 -3px 8px rgba(0,0,0,0.5)",
            }}
          />
        </div>

        <div
          className="container"
          style={{ position: "relative", zIndex: 3, width: "100%" }}
        >
          <div style={{ maxWidth: 720 }}>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: "var(--sp-6)",
                color: "var(--fg-primary)",
              }}
            >
              <span style={{ color: "var(--accent-primary)" }}>Plan.</span>
              <br />
              Lock In.
              <br />
              <span style={{ color: "var(--accent-primary)" }}>Earn.</span>
            </h1>
            <p
              style={{
                fontSize: "var(--font-size-lg)",
                color: "var(--fg-secondary)",
                maxWidth: 560,
                marginBottom: "var(--sp-10)",
                lineHeight: 1.7,
              }}
            >
              Automate bill payments, reach savings goals, lock USDC for fixed
              terms, or stash a slice of your every spend, and earn yield on all
              of it.
            </p>
            <div
              style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap" }}
            >
              <button
                className="lkt-btn-primary"
                onClick={handleCTA}
                style={{
                  background: "var(--accent-primary)",
                  color: "var(--fg-primary)",
                  border: "none",
                  padding: "var(--sp-4) var(--sp-8)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                {address ? "Open Dashboard " : "Connect Wallet "}
                <span className="lkt-arrow">→</span>
              </button>
              <a
                className="lkt-btn-ghost"
                href="#how-it-works"
                style={{
                  background: "transparent",
                  color: "var(--fg-primary)",
                  border: "1px solid var(--border-hover)",
                  padding: "var(--sp-4) var(--sp-8)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-md)",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--sp-2)",
                }}
              >
                Learn More <span className="lkt-arrow">↓</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom border */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "var(--border)",
          }}
        />
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        style={{
          padding: "var(--sp-24) 0",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          ...DOT,
        }}
      >
        <div className="container">
          <h2
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: 700,
              marginBottom: "var(--sp-16)",
              letterSpacing: "-0.01em",
            }}
          >
            The financial discipline you've been meaning to have.
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-md)",
              color: "var(--fg-secondary)",
              maxWidth: 640,
              marginTop: "calc(-1 * var(--sp-12))",
              marginBottom: "var(--sp-16)",
              lineHeight: 1.7,
            }}
          >
            {/* Bills get paid before they're due,
            savings hit their goals on schedule, and money you've set aside is
            quietly earning the whole time. */}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 0,
              border: "1px solid var(--border)",
            }}
          >
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="lkt-step-card"
                style={{
                  padding: "var(--sp-8) var(--sp-6)",
                  borderRight:
                    i < STEPS.length - 1 ? "1px solid var(--border)" : "none",
                  background: i % 2 === 1 ? "var(--bg-surface)" : "transparent",
                }}
              >
                <div
                  className="lkt-step-n"
                  style={{
                    fontSize: "var(--font-size-4xl)",
                    fontWeight: 700,
                    color: "var(--border)",
                    marginBottom: "var(--sp-4)",
                    lineHeight: 1,
                  }}
                >
                  {step.n}
                </div>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--fg-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES + COMING SOON (merged) ── */}
      <section
        id="features"
        style={{
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* ── Four ways to commit ── */}
        <div
          style={{
            padding: "var(--sp-24) 0",
            ...DOT,
          }}
        >
          <div className="container">
            <h2
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: 700,
                marginBottom: "var(--sp-16)",
                letterSpacing: "-0.01em",
              }}
            >
              Four ways to commit
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 0,
                border: "1px solid var(--border)",
              }}
            >
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="lkt-feature-card"
                  style={{
                    padding: "var(--sp-8) var(--sp-6)",
                    borderRight:
                      (i + 1) % 2 !== 0 ? "1px solid var(--border)" : "none",
                    borderBottom: i < 2 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span
                    className="lkt-icon"
                    style={{
                      fontSize: "var(--font-size-2xl)",
                      display: "block",
                      marginBottom: "var(--sp-4)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    {f.icon}
                  </span>
                  <h3
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 600,
                      marginBottom: "var(--sp-3)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--fg-secondary)",
                      lineHeight: 1.65,
                    }}
                  >
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Coming Soon band ── */}
        <div
          style={{
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--border)",
            padding: "var(--sp-16) 0",
            ...DOT,
          }}
        >
          <div className="container">
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.2em",
                color: "var(--fg-secondary)",
                textTransform: "uppercase",
                marginBottom: "var(--sp-10)",
              }}
            >
              Coming Soon
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 0,
                border: "1px solid var(--border)",
              }}
            >
              {/* Blend yield */}
              <div
                className="lkt-soon-panel"
                style={{
                  padding: "var(--sp-8) var(--sp-6)",
                  borderRight: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-2xl)",
                    display: "block",
                    marginBottom: "var(--sp-4)",
                    color: "var(--accent-secondary)",
                  }}
                ></span>
                <h3
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    marginBottom: "var(--sp-3)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Earn Yield via Blend
                </h3>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--fg-secondary)",
                    lineHeight: 1.65,
                    marginBottom: "var(--sp-6)",
                  }}
                >
                  Every USDC committed to Loktin — whether in a billing plan,
                  savings target, lock, or spend vault — will earn yield through
                  Blend while it sits idle. Bills still pay on time. Goals still
                  mature. Your discipline pays you back.
                </p>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    padding: "var(--sp-1)",
                  }}
                >
                  {[
                    { label: "$500 locked for 3 months", value: "" },
                    { label: "Est. Blend APY", value: "~8–12%" },
                    { label: "Est. interest earned", value: "~$12–18" },
                  ].map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "var(--sp-3) var(--sp-4)",
                        borderBottom:
                          i < 2 ? "1px solid var(--border)" : "none",
                        fontSize: "var(--font-size-xs)",
                      }}
                    >
                      <span style={{ color: "var(--fg-muted)" }}>
                        {row.label}
                      </span>
                      {row.value && (
                        <span
                          style={{
                            color: "var(--accent-secondary)",
                            fontWeight: 600,
                          }}
                        >
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--fg-secondary)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginTop: "var(--sp-5)",
                  }}
                >
                  Blend Integration · In Development
                </p>
              </div>

              {/* ZK Privacy */}
              <div
                className="lkt-soon-panel"
                style={{ padding: "var(--sp-8) var(--sp-6)" }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-2xl)",
                    display: "block",
                    marginBottom: "var(--sp-4)",
                    color: "var(--accent-secondary)",
                  }}
                ></span>
                <h3
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    marginBottom: "var(--sp-3)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Save Privately
                </h3>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--fg-secondary)",
                    lineHeight: 1.65,
                    marginBottom: "var(--sp-6)",
                  }}
                >
                  Every plan, deposit, and payment is recorded on Stellar —
                  immutable and auditable. Zero-knowledge proofs will let the
                  network verify your commitments without exposing your balances
                  or strategy to anyone. On-chain, but yours alone.
                </p>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    padding: "var(--sp-1)",
                  }}
                >
                  {[
                    { label: "On-chain & verifiable", value: "✓" },
                    { label: "Balances visible to others", value: "✗" },
                    { label: "Strategy visible to others", value: "✗" },
                  ].map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "var(--sp-3) var(--sp-4)",
                        borderBottom:
                          i < 2 ? "1px solid var(--border)" : "none",
                        fontSize: "var(--font-size-xs)",
                      }}
                    >
                      <span style={{ color: "var(--fg-muted)" }}>
                        {row.label}
                      </span>
                      <span
                        style={{
                          color:
                            row.value === "✓"
                              ? "var(--accent-secondary)"
                              : "var(--fg-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--fg-secondary)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginTop: "var(--sp-5)",
                  }}
                >
                  Private Savings · In Development
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "var(--sp-20) 0" }}>
        <div
          className="container"
          style={{ textAlign: "center", maxWidth: 800, margin: "0 auto" }}
        >
          <h2
            style={{
              fontSize: "var(--font-size-4xl)",
              fontWeight: 700,
              marginBottom: "var(--sp-5)",
              letterSpacing: "-0.09em",
            }}
          >
            Connect your wallet and create your first plan.
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-md)",
              color: "var(--fg-secondary)",
              marginBottom: "var(--sp-6)",
              lineHeight: 1.7,
            }}
          >
            {/* Connect your wallet and set up your first plan, savings goal, or
            lock in under 2 minutes. */}
          </p>
          <button
            className="lkt-btn-mega"
            onClick={handleCTA}
            style={{
              background: "var(--accent-primary)",
              color: "var(--fg-primary)",
              border: "none",
              padding: "var(--sp-5) var(--sp-12)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-md)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            {address ? "OPEN DASHBOARD " : "GET STARTED "}
            <span className="lkt-arrow">→</span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "var(--sp-8) 0",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "var(--font-size-xs)",
            color: "var(--fg-muted)",
            flexWrap: "wrap",
            gap: "var(--sp-4)",
          }}
        >
          <span
            className="lkt-wordmark"
            style={{ fontWeight: 700, letterSpacing: "0.1em" }}
          >
            LOKTIN
          </span>
          <span>© 2026 Loktin</span>
          <a
            className="lkt-link-arrow"
            href={`https://stellar.expert/explorer/testnet/contract/CBCKKGNNNFSMTE2IPVGA5YUHSTIN4XX5MQ7LZN4MCPHAKATHWZODGXJN`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--fg-primary)", textDecoration: "none" }}
          >
            View Contract <span className="lkt-arrow">↗</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
