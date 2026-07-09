import { useEffect, useRef, useState, type ReactNode } from "react";

export type RevealVariant = "up" | "left" | "right" | "scale" | "fade";

interface Props {
  children: ReactNode;
  /** Animation style. `up` is direction-aware (rises/settles from the side you
   *  approach from); the rest are fixed. */
  variant?: RevealVariant;
  /** Stagger delay in ms. */
  delay?: number;
  /** Transition duration in ms. */
  duration?: number;
  /** Animate only the first time (default re-animates each time it enters). */
  once?: boolean;
  className?: string;
}

/**
 * Scroll reveal (IntersectionObserver + Tailwind transitions). Re-animates each
 * time the element enters the viewport — and for the `up` variant, it tracks
 * whether you're scrolling toward it (rises from below) or back up to it
 * (settles from above). Honors prefers-reduced-motion.
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  duration = 700,
  once = false,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [side, setSide] = useState<"above" | "below">("below");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else {
          setInView(false);
          // Which edge did it leave by? Drives the direction it returns from.
          setSide(entry.boundingClientRect.top < 0 ? "above" : "below");
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const hidden =
    variant === "left"
      ? "-translate-x-16 opacity-0"
      : variant === "right"
        ? "translate-x-16 opacity-0"
        : variant === "scale"
          ? "scale-90 opacity-0"
          : variant === "fade"
            ? "opacity-0"
            : side === "above"
              ? "-translate-y-12 opacity-0"
              : "translate-y-12 opacity-0";

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
      className={`transition ease-out will-change-transform motion-reduce:!translate-x-0 motion-reduce:!translate-y-0 motion-reduce:!scale-100 motion-reduce:!opacity-100 motion-reduce:!transition-none ${
        inView ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden
      } ${className}`}
    >
      {children}
    </div>
  );
}
