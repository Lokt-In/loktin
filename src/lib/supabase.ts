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
