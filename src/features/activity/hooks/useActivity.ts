import { useState, useEffect, useCallback } from "react";
import { rpc as StellarRpc, scValToNative } from "@stellar/stellar-sdk";
import * as LockedIn from "locked_in";
import * as TargetSavings from "target_savings";
import { rpcUrl } from "../../../contracts/util";
import { useWallet } from "../../../hooks/useWallet";
import { formatUsdcAdaptive } from "../../../shared/lib/money";
import type { TargetGoal } from "../../targets/hooks/useTargets";

const LOCKED_ID = LockedIn.networks.testnet.contractId;
const TARGET_ID = TargetSavings.networks.testnet.contractId;

// Soroban RPC only retains a recent ledger window. ~1 day at ~5s/ledger keeps
// the query fast and well inside retention; activity older than this simply
// isn't available to read, so the feed is honestly "recent" only.
const LOOKBACK_LEDGERS = 17_280;

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
  /** Ledger close time, unix seconds. */
  at: number;
}

// Event amounts arrive as bigint via scValToNative; guard the type since it's
// typed `unknown`. Adaptive so a sub-cent amount doesn't read as 0.00.
const fmt = (n: unknown) => formatUsdcAdaptive(typeof n === "bigint" ? n : 0n);

/**
 * Recent on-chain activity for the connected wallet, read from contract events.
 *
 * `getEvents` can't filter on event *data*, only on contract + topics, so we
 * pull both contracts' events over the retention window and drop anything whose
 * `user` field isn't the connected address. Target events carry only an id, so
 * goal names are joined in from already-loaded goals.
 */
export function useActivity(goals: TargetGoal[]) {
  const { address } = useWallet();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address) {
      setActivity([]);
      return;
    }
    setLoading(true);
    try {
      const server = new StellarRpc.Server(rpcUrl, {
        allowHttp: rpcUrl.startsWith("http://"),
      });
      const latest = (await server.getLatestLedger()).sequence;
      const startLedger = Math.max(1, latest - LOOKBACK_LEDGERS);

      const res = await server.getEvents({
        startLedger,
        filters: [{ type: "contract", contractIds: [LOCKED_ID, TARGET_ID] }],
        limit: 200,
      });

      const goalName = (id: unknown) =>
        goals.find((g) => g.id === BigInt(Number(id ?? -1)))?.name;

      const out: Activity[] = [];
      for (const e of res.events) {
        let name: string;
        let data: Record<string, unknown>;
        try {
          name = String(scValToNative(e.topic[0]));
          data = scValToNative(e.value) as Record<string, unknown>;
        } catch {
          continue; // undecodable event — skip rather than guess
        }
        // scValToNative decodes an ScAddress to its G... string. Guard the type
        // so a malformed event can't stringify to "[object Object]" and slip the
        // owner check.
        if (typeof data.user !== "string" || data.user !== address) continue;

        const at = Math.floor(new Date(e.ledgerClosedAt).getTime() / 1000);
        const base = { id: `${e.id}`, at };

        switch (name) {
          case "locked":
            out.push({
              ...base,
              kind: "lock",
              title: "Lock created",
              detail: `${fmt(data.amount)} USDC locked`,
            });
            break;
          case "unlocked":
            out.push({
              ...base,
              kind: "unlock",
              title: "Lock unlocked",
              detail: `${fmt(data.payout)} USDC to wallet`,
            });
            break;
          case "target_created": {
            const n = goalName(data.target_id);
            out.push({
              ...base,
              kind: "goal-created",
              title: "Goal created",
              detail: n ? `Goal · ${n}` : "New savings goal",
            });
            break;
          }
          case "manual_deposit": {
            const n = goalName(data.target_id);
            out.push({
              ...base,
              kind: "top-up",
              title: "Manual top-up",
              detail: `${fmt(data.amount)} USDC${n ? ` · ${n}` : ""}`,
            });
            break;
          }
          case "period_deposit": {
            const n = goalName(data.target_id);
            out.push({
              ...base,
              kind: "period-deposit",
              title: "Auto-deposit",
              detail: `${fmt(data.amount)} USDC${n ? ` · ${n}` : ""}`,
            });
            break;
          }
          case "withdrawn": {
            const n = goalName(data.target_id);
            out.push({
              ...base,
              kind: "withdraw",
              title: "Goal withdrawn",
              detail: `${fmt(data.to_user)} USDC to wallet${n ? ` · ${n}` : ""}`,
            });
            break;
          }
          case "missed": {
            const n = goalName(data.target_id);
            out.push({
              ...base,
              kind: "missed",
              title: "Deposit missed",
              detail: n ? `Insufficient funds · ${n}` : "Insufficient funds",
            });
            break;
          }
          default:
            break; // admin / blend / config events aren't user activity
        }
      }

      out.sort((a, b) => b.at - a.at);
      setActivity(out);
    } catch (e) {
      // Non-fatal: the panel shows an empty state rather than blocking the page.
      console.error("useActivity:", e);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [address, goals]);

  useEffect(() => {
    void load();
  }, [load]);

  return { activity, loading, reload: load };
}
