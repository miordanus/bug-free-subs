import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabaseServer"

export async function GET(req: NextRequest) {
  const rawId = req.headers.get("x-telegram-user-id")
  if (!rawId) {
    return NextResponse.json({ error: "Missing x-telegram-user-id" }, { status: 400 })
  }

  const userId = parseInt(rawId, 10)
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid telegram_user_id" }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from("household_members")
    .select("household_id, households(name)")
    .eq("telegram_user_id", userId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: "not_in_household" }, { status: 404 })
  }

  const householdName =
    data.households && !Array.isArray(data.households)
      ? (data.households as { name: string }).name
      : Array.isArray(data.households) && data.households.length > 0
        ? (data.households[0] as { name: string }).name
        : null

  return NextResponse.json({
    household_id: data.household_id as string,
    household_name: householdName ?? null,
  })
}
