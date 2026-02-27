// SERVER ONLY — import only from app/api/* route handlers.
// This module uses SUPABASE_SERVICE_ROLE_KEY which must never reach the browser.

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Lazily initialised so the module can be imported without env vars at build time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): SupabaseClient<any> {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("Missing Supabase env vars")
    _client = createClient(url, key)
  }
  return _client
}

/** Resolve household_id for a given Telegram user. Returns null if not found. */
export async function getHouseholdId(telegramUserId: number): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("household_members")
    .select("household_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle()

  if (error || !data) return null
  return data.household_id as string
}
