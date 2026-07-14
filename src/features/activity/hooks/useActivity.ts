import { useMemo } from "react";
import { formatUsdcAdaptive } from "../../../shared/lib/money";
import type { Lock } from "../../locked/hooks/useLocks";
import type { TargetGoal } from "../../targets/hooks/useTargets";

export type ActivityKind =
  | "lock"
  | "unlock"
  | "goal-created"
  | "top-up"
  | "period-deposit"
  | "withdraw"
  | "missed";

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  /** Unix seconds; used to sort and render a relative time. */
  at: number;
}

const fmt = (n: bigint) => formatUsdcAdaptive(n);

/**
 * Recent account activity for the dashboard, derived from the locks and goals
 * already loaded for the connected wallet.
 *
 * The event-log approach doesn't work here: the deployed Locked In / Target
 * Savings contracts don't emit their own domain events. The only contract event
 * per transaction is the USDC SAC's `transfer`, so `getEvents` filtered on our
 * contracts reads back empty and the feed never populates. Instead we
 * reconstruct the feed from on-chain state, which carries the timestamps we
 * need (`start_date`, `last_deposit_date`). If the contracts later emit events,
 * this can move back to a `getEvents` feed for richer, per-action history.
 */
export function useActivity(locks: Lock[], goals: TargetGoal[]) {
  const activity = useMemo<Activity[]>(() => {
    const out: Activity[] = [];

    for (const l of locks) {
      out.push({
        id: `lock-${l.id}`,
        kind: "lock",
        title: "Lock created",
        detail: `${fmt(l.amount)} USDC locked`,
        at: Number(l.start_date),
      });
    }

    for (const g of goals) {
      out.push({
        id: `goal-${g.id}`,
        kind: "goal-created",
        title: "Goal created",
        detail: g.name ? `Goal · ${g.name}` : "New savings goal",
        at: Number(g.start_date),
      });
      // A deposit that landed after creation: surface the running total at the
      // time of the most recent deposit. Guarded so a goal that has only been
      // created doesn't show a phantom deposit row.
      if (g.deposited > 0n && g.last_deposit_date > g.start_date) {
        out.push({
          id: `goal-dep-${g.id}`,
          kind: "top-up",
          title: "Deposit",
          detail: `${fmt(g.deposited)} USDC saved${g.name ? ` · ${g.name}` : ""}`,
          at: Number(g.last_deposit_date),
        });
      }
    }

    return out.sort((a, b) => b.at - a.at);
  }, [locks, goals]);

  return { activity };
}
