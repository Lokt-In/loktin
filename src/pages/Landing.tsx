import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWallet } from "../util/wallet";
import { useWallet } from "../hooks/useWallet";

// ── Interactive canvas background ─────────────────────────────────
// Floating financial glyphs (coins, locks, blocks) that physically follow
// the cursor: each shape feels a magnetic pull toward the mouse, with damping
// so they orbit/swarm naturally before returning to their home position.
// Disabled on touch / small-screen devices.
function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => {
      const isTouch = window.matchMedia(
        "(hover: none), (pointer: coarse)",
      ).matches;
      const isSmall = window.innerWidth < 768;
      setEnabled(!isTouch && !isSmall);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    type Glyph = {
      x: number;
      y: number;
      homeX: number;
      homeY: number;
      vx: number;
      vy: number;
      size: number;
      type: 0 | 1 | 2; // coin, lock, block
      rot: number;
      rotSpeed: number;
      opacity: number;
    };

    const W = window.innerWidth,
      H = window.innerHeight;
    const COUNT = Math.min(38, Math.max(20, Math.floor((W * H) / 35000)));

    const glyphs: Glyph[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      homeX: Math.random() * W,
      homeY: Math.random() * H,
      vx: 0,
      vy: 0,
      size: 8 + Math.random() * 14,
      type: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.01,
      opacity: 0.25 + Math.random() * 0.45,
    }));

    const drawCoin = (x: number, y: number, r: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.35);
      ctx.lineTo(0, r * 0.35);
      ctx.stroke();
      ctx.restore();
    };

    const drawLock = (x: number, y: number, s: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // Body
      ctx.strokeRect(-s * 0.5, 0, s, s * 0.75);
      // Shackle (semicircle on top)
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, Math.PI, 0);
      ctx.stroke();
      // Keyhole dot
      ctx.beginPath();
      ctx.arc(0, s * 0.35, s * 0.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawBlock = (x: number, y: number, s: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.beginPath();
      ctx.moveTo(-s / 2 + 4, -s / 2 + s * 0.35);
      ctx.lineTo(s / 2 - 4, -s / 2 + s * 0.35);
      ctx.stroke();
      ctx.restore();
    };

    // Tunable physics
    const ATTRACT_RADIUS = 280; // px from cursor where attraction kicks in
    const ATTRACT_FORCE = 0.85;
    const HOME_FORCE = 0.012;
    const DAMPING = 0.92;
    const MAX_SPEED = 8;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const mx = mouse.current.x;
      const my = mouse.current.y;

      glyphs.forEach((g) => {
        // 1. Cursor attraction (magnetic, falls off with distance)
        const dx = mx - g.x;
        const dy = my - g.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTRACT_RADIUS && dist > 0.5) {
          const falloff = 1 - dist / ATTRACT_RADIUS;
          const force = ATTRACT_FORCE * falloff * falloff;
          g.vx += (dx / dist) * force;
          g.vy += (dy / dist) * force;
        }

        // 2. Spring back toward home position when cursor is far
        g.vx += (g.homeX - g.x) * HOME_FORCE;
        g.vy += (g.homeY - g.y) * HOME_FORCE;

        // 3. Damping
        g.vx *= DAMPING;
        g.vy *= DAMPING;

        // 4. Clamp speed
        const speed = Math.sqrt(g.vx * g.vx + g.vy * g.vy);
        if (speed > MAX_SPEED) {
          g.vx = (g.vx / speed) * MAX_SPEED;
          g.vy = (g.vy / speed) * MAX_SPEED;
        }

        g.x += g.vx;
        g.y += g.vy;
        g.rot += g.rotSpeed;

        // 5. Render
        const closeBoost =
          dist < ATTRACT_RADIUS ? (1 - dist / ATTRACT_RADIUS) * 0.5 : 0;
        const finalOpacity = Math.min(0.95, g.opacity + closeBoost);
        const isAccent = g.type === 1; // locks use accent purple
        const stroke = isAccent ? "129, 124, 200" : "240, 244, 248"; // brighter than fg-accent

        ctx.globalAlpha = finalOpacity;
        ctx.strokeStyle = `rgba(${stroke}, 1)`;
        ctx.lineWidth = 1.4;

        if (g.type === 0) drawCoin(g.x, g.y, g.size, g.rot);
        else if (g.type === 1) drawLock(g.x, g.y, g.size, g.rot);
        else drawBlock(g.x, g.y, g.size, g.rot);
      });

      ctx.globalAlpha = 1;
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── Feature cards data ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: "▤",
    title: "Plans",
    body: "Lock USDC into a billing plan. Add bills with due dates. Loktin auto-pays them on time, on-chain.",
  },
  {
    icon: "◎",
    title: "Target Savings",
    body: "Set a goal, a deadline, and a deposit cadence. Loktin debits on schedule. Forfeit 1% if you withdraw early.",
  },
  {
    icon: "⬛",
    title: "Locked In",
    body: "Lock a fixed amount for a fixed term — 1, 3, 6, or 12 months. Tiered APY. No early withdrawal.",
  },
  {
    icon: "↻",
    title: "Spend & Save",
    body: "Auto-route a configured % of every USDC spend into a vault. Withdraw only on the 28th of each month.",
  },
  {
    icon: "✦",
    title: "Earn via Blend",
    body: "Every USDC you commit earns yield through Blend while it sits idle. Your discipline pays you back.",
  },
  {
    icon: "⬡",
    title: "On-Chain & Verifiable",
    body: "Every plan, lock, deposit, and payment is recorded on Stellar. Immutable. Auditable. Yours.",
  },
];

const STEPS = [
  {
    n: "01",
    label: "Plan",
    body: "Whether it's a billing plan, savings target, fixed lock, or auto-save on spend.",
  },
  {
    n: "02",
    label: "Lock In",
    body: "Funds are time-locked and rule-bound; discipline by design.",
  },
  {
    n: "03",
    label: "Earn",
    body: "Locked funds generate yield via Blend while you wait. Idle money becomes working money.",
  },
  {
    n: "04",
    label: "Withdraw",
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
            style={{
              fontWeight: 700,
              letterSpacing: "0.14em",
              fontSize: "var(--font-size-lg)",
            }}
          >
            LOKTIN
          </span>
          <button
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
            {address ? "OPEN APP →" : "CONNECT WALLET →"}
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
        <InteractiveBackground />

        {/* Vertical grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "space-evenly",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{ width: 1, background: "var(--border)", height: "100%" }}
            />
          ))}
        </div>

        <div
          className="container"
          style={{ position: "relative", zIndex: 1, width: "100%" }}
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
                {address ? "Open Dashboard →" : "Connect Wallet →"}
              </button>
              <a
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
                }}
              >
                Learn More ↓
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
            Plan. Lock In. Earn.
          </h2>
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
                style={{
                  padding: "var(--sp-8) var(--sp-6)",
                  borderRight:
                    i < STEPS.length - 1 ? "1px solid var(--border)" : "none",
                  background: i % 2 === 1 ? "var(--bg-surface)" : "transparent",
                }}
              >
                <div
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
                <h3
                  style={{
                    fontSize: "var(--font-size-md)",
                    fontWeight: 600,
                    marginBottom: "var(--sp-3)",
                    color: "var(--fg-primary)",
                  }}
                >
                  {step.label}
                </h3>
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

      {/* ── FEATURES ── */}
      <section
        id="features"
        style={{
          padding: "var(--sp-24) 0",
          borderBottom: "1px solid var(--border)",
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
                style={{
                  padding: "var(--sp-8) var(--sp-6)",
                  borderRight:
                    (i + 1) % 3 !== 0 ? "1px solid var(--border)" : "none",
                  borderBottom: i < 3 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
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
      </section>

      {/* ── BLEND TEASER ── */}
      <section
        style={{
          padding: "var(--sp-24) 0",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--sp-16)",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.2em",
                color: "var(--accent-secondary)",
                textTransform: "uppercase",
                marginBottom: "var(--sp-3)",
              }}
            >
              Coming Soon
            </p>
            <h2
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: 700,
                marginBottom: "var(--sp-6)",
                lineHeight: 1.2,
              }}
            >
              Earn on every
              <br />
              USDC committed
            </h2>
            {/* <p style={{ fontSize: "var(--font-size-md)", color: "var(--fg-secondary)", lineHeight: 1.7, marginBottom: "var(--sp-8)" }}>
              Whatever you commit — a billing plan, a savings goal, a fixed lock, or your spend-and-save vault — Loktin will route idle USDC through <strong style={{ color: "var(--fg-primary)" }}>Blend</strong>, Stellar's lending protocol. Bills still pay on time. Goals still mature. The difference? Your money is also working.
            </p> */}
            <div
              style={{
                display: "inline-block",
                padding: "var(--sp-2) var(--sp-4)",
                border: "1px solid var(--accent-secondary)",
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.1em",
                color: "var(--accent-secondary)",
                textTransform: "uppercase",
              }}
            >
              Blend Integration · In Development
            </div>
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              padding: "var(--sp-8)",
            }}
          >
            {[
              { label: "Lock $500 for 3 months", value: "" },
              { label: "Est. APY (Blend)", value: "~8–12%" },
              { label: "Est. interest earned", value: "~$12–18" },
              { label: "All commitments earn", value: "✓" },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-4) 0",
                  borderBottom: i < 3 ? "1px solid var(--border)" : "none",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <span style={{ color: "var(--fg-muted)" }}>{row.label}</span>
                {row.value && (
                  <span
                    style={{ color: "var(--accent-primary)", fontWeight: 600 }}
                  >
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "var(--sp-24) 0" }}>
        <div
          className="container"
          style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}
        >
          <h2
            style={{
              fontSize: "var(--font-size-4xl)",
              fontWeight: 700,
              marginBottom: "var(--sp-6)",
              letterSpacing: "-0.02em",
            }}
          >
            Plan it. Lock it.
            <br />
            Earn from it.
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-md)",
              color: "var(--fg-secondary)",
              marginBottom: "var(--sp-10)",
              lineHeight: 1.7,
            }}
          >
            Connect your wallet and set up your first plan, savings goal, or
            lock in under 2 minutes.
          </p>
          <button
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
            {address ? "OPEN DASHBOARD →" : "GET STARTED →"}
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
          <span style={{ fontWeight: 700, letterSpacing: "0.1em" }}>
            LOKTIN
          </span>
          <span>© 2026 Loktin</span>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/CBCKKGNNNFSMTE2IPVGA5YUHSTIN4XX5MQ7LZN4MCPHAKATHWZODGXJN`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--fg-primary)", textDecoration: "none" }}
          >
            View Contract ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
