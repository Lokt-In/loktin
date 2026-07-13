import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Off-chain goal index (hardening #2). Reads the list of active goal ids from
 * Supabase `target_goals_cache` so the keeper doesn't have to walk goal ids
 * 1..N on chain every run. The chain stays the source of truth — this is just a
 * fast lookup of *which* goals to look at.
 *
 * Optional: if SUPABASE_URL / SUPABASE_KEY aren't set, the index is disabled and
 * the keeper falls back to the on-chain walk.
 */
let client: SupabaseClient | null = null;

export function initGoalIndex(): boolean {
  // Accept either keeper-specific names or the PUBLIC_ names already in .env.
  const url = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  client = createClient(url, key, { auth: { persistSession: false } });
  return true;
}

/**
 * Active goal ids for `contractId`. Returns `null` when the index is unavailable
 * or empty — the caller should then fall back to the on-chain walk, so we never
 * silently skip goals during the transition before the frontend starts writing
 * rows.
 */
export async function getActiveGoalIds(
  contractId: string,
): Promise<bigint[] | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("target_goals_cache")
      .select("goal_id")
      .eq("is_complete", false)
      // Match this contract, tolerating legacy rows with no contract_id yet.
      .or(`contract_id.eq.${contractId},contract_id.is.null`);

    if (error) {
      console.warn(
        `  goal index unavailable (${error.message}); using chain walk`,
      );
      return null;
    }
    const ids = (data ?? []).map((r: { goal_id: number | string }) =>
      BigInt(r.goal_id),
    );
    return ids.length > 0 ? ids : null;
  } catch (e) {
    console.warn(
      `  goal index error (${e instanceof Error ? e.message : e}); using chain walk`,
    );
    return null;
  }
}
