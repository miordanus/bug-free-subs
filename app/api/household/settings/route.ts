import { NextRequest, NextResponse } from "next/server"
import { getSupabase, getHouseholdId } from "@/lib/supabaseServer"

const DEFAULT_OWNER_LABELS = { me: "Max", wife: "Molly" }

export async function GET(req: NextRequest) {
  const rawId = req.headers.get("x-telegram-user-id")
  if (!rawId) {
    return NextResponse.json({ error: "Missing x-telegram-user-id" }, { status: 400 })
  }
  const userId = parseInt(rawId, 10)
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid telegram_user_id" }, { status: 400 })
  }

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "not_in_household" }, { status: 403 })
  }

  const supabase = getSupabase()
  const { data: existing, error: selectErr } = await supabase
    .from("household_settings")
    .select("*")
    .eq("household_id", householdId)
    .maybeSingle()

  if (selectErr) {
    return NextResponse.json({ error: selectErr.message }, { status: 500 })
  }

  let data = existing
  if (!data) {
    const { data: inserted, error: insertErr } = await supabase
      .from("household_settings")
      .insert({
        household_id: householdId,
        owner_labels: DEFAULT_OWNER_LABELS,
        category_suggestions: [],
        card_suggestions: [],
      })
      .select()
      .single()

    if (insertErr) {
      if (insertErr.code === "23505") {
        // Race condition: another concurrent request inserted the row first — fetch it
        const { data: raced, error: raceErr } = await supabase
          .from("household_settings")
          .select("*")
          .eq("household_id", householdId)
          .single()
        if (raceErr) return NextResponse.json({ error: raceErr.message }, { status: 500 })
        data = raced
      } else {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }
    } else {
      data = inserted
    }
  }

  return NextResponse.json({
    ownerLabels: (data?.owner_labels as Record<string, string>) ?? DEFAULT_OWNER_LABELS,
    categorySuggestions: (data?.category_suggestions as string[]) ?? [],
    cardSuggestions: (data?.card_suggestions as string[]) ?? [],
  })
}

export async function POST(req: NextRequest) {
  const rawId = req.headers.get("x-telegram-user-id")
  if (!rawId) {
    return NextResponse.json({ error: "Missing x-telegram-user-id" }, { status: 400 })
  }
  const userId = parseInt(rawId, 10)
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid telegram_user_id" }, { status: 400 })
  }

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "not_in_household" }, { status: 403 })
  }

  let body: { ownerLabels?: Record<string, string> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("household_settings")
    .upsert(
      {
        household_id: householdId,
        owner_labels: body.ownerLabels ?? DEFAULT_OWNER_LABELS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "household_id" }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ownerLabels: (data?.owner_labels as Record<string, string>) ?? DEFAULT_OWNER_LABELS,
    categorySuggestions: (data?.category_suggestions as string[]) ?? [],
    cardSuggestions: (data?.card_suggestions as string[]) ?? [],
  })
}
