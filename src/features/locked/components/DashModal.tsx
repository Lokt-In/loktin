import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}

/**
 * Centered dark modal over a blurred backdrop. Closes on Escape and on
 * backdrop click; focus moves into the panel so keyboard users aren't stranded
 * behind it.
 */
export default function DashModal({
  open,
  onClose,
  labelledBy,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    // Don't let the page behind scroll while the modal owns the viewport.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center bg-ink/70 px-5 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] rounded-2xl border border-[#ffffff14] bg-surface p-8 outline-none"
      >
        {children}
      </div>
    </div>
  );
}
