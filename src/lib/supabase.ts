import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type SupabaseUser = {
  id: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Template = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: "cycle" | "bill";
  data: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
};

export type NotificationPrefs = {
  bill_due_alerts: boolean;
  payment_confirmations: boolean;
  cycle_end_warnings: boolean;
};

// ── User helpers ────────────────────────────────────────────────

export async function upsertUser(
  wallet_address: string,
): Promise<SupabaseUser | null> {
  if (!supabase) return null;
  const res = await supabase
    .from("users")
    .upsert({ wallet_address }, { onConflict: "wallet_address" })
    .select()
    .single();
  if (res.error) {
    console.error("upsertUser:", res.error);
    return null;
  }
  return res.data as SupabaseUser;
}

export async function getUser(
  wallet_address: string,
): Promise<SupabaseUser | null> {
  if (!supabase) return null;
  const res = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", wallet_address)
    .single();
  return res.data as SupabaseUser | null;
}

export async function updateUser(
  wallet_address: string,
  updates: Partial<Pick<SupabaseUser, "username" | "avatar_url">>,
): Promise<SupabaseUser | null> {
  if (!supabase) return null;
  const res = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("wallet_address", wallet_address)
    .select()
    .single();
  if (res.error) {
    console.error("updateUser:", res.error);
    return null;
  }
  return res.data as SupabaseUser;
}

// ── Template helpers ─────────────────────────────────────────────

export async function getTemplates(user_id: string): Promise<Template[]> {
  if (!supabase) return [];
  const res = await supabase
    .from("templates")
    .select("*")
    .or(`user_id.eq.${user_id},is_public.eq.true`)
    .order("created_at", { ascending: false });
  return (res.data ?? []) as Template[];
}

export async function saveTemplate(
  template: Omit<Template, "id" | "created_at">,
): Promise<Template | null> {
  if (!supabase) return null;
  const res = await supabase
    .from("templates")
    .insert(template)
    .select()
    .single();
  if (res.error) {
    console.error("saveTemplate:", res.error);
    return null;
  }
  return res.data as Template;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("templates").delete().eq("id", id);
  return !error;
}

// ── Notification prefs ───────────────────────────────────────────

const DEFAULT_PREFS: NotificationPrefs = {
  bill_due_alerts: true,
  payment_confirmations: true,
  cycle_end_warnings: true,
};

export async function getNotificationPrefs(
  user_id: string,
): Promise<NotificationPrefs> {
  if (!supabase) return DEFAULT_PREFS;
  const res = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user_id)
    .single();
  return (res.data as NotificationPrefs | null) ?? DEFAULT_PREFS;
}

export async function upsertNotificationPrefs(
  user_id: string,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("notification_preferences").upsert({ user_id, ...prefs });
}

// ── Target Savings goal index ────────────────────────────────────
// Keeps `target_goals_cache` in sync so the keeper can find active goals without
// scanning the chain. Call `registerTargetGoal` right after an on-chain
// `create_target` succeeds, and `completeTargetGoal` right after a `withdraw`.
// Both are no-ops if Supabase isn't configured, so they're always safe to call.

export type RegisterGoalInput = {
  goalId: bigint; // id returned by create_target
  contractId: string; // the Target Savings contract id (e.g. TargetSavings.networks.testnet.contractId)
  walletAddress: string; // the goal owner's address
  name: string;
  targetAmount?: bigint; // raw stroops (optional, for display)
  endDate?: bigint; // unix seconds (optional, for display)
};

/** Register a newly created goal so the keeper picks it up. Returns false on failure. */
export async function registerTargetGoal(
  g: RegisterGoalInput,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("target_goals_cache").insert({
    goal_id: Number(g.goalId),
    contract_id: g.contractId,
    wallet_address: g.walletAddress,
    name: g.name,
    target_amount: g.targetAmount != null ? g.targetAmount.toString() : null,
    end_date:
      g.endDate != null
        ? new Date(Number(g.endDate) * 1000).toISOString()
        : null,
    is_complete: false,
  });
  if (error) {
    console.error("registerTargetGoal:", error);
    return false;
  }
  return true;
}

/** Mark a goal complete so the keeper stops processing it. Returns false on failure. */
export async function completeTargetGoal(
  goalId: bigint,
  contractId: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("target_goals_cache")
    .update({ is_complete: true, updated_at: new Date().toISOString() })
    .eq("goal_id", Number(goalId))
    .eq("contract_id", contractId);
  if (error) {
    console.error("completeTargetGoal:", error);
    return false;
  }
  return true;
}
