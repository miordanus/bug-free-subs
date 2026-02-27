import { NextRequest, NextResponse } from "next/server"
import { getSupabase, getHouseholdId } from "@/lib/supabaseServer"
import { Subscription } from "@/types/subscription"

function rowToSub(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    name: row.name as string,
    amount: Number(row.amount),
    currency: row.currency as Subscription["currency"],
    billingCycle: row.billing_cycle as Subscription["billingCycle"],
    nextChargeDate: row.next_charge_date as string,
    category: (row.category as string) ?? "",
    card: (row.card as string) ?? "",
    owner: row.owner as Subscription["owner"],
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

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
    return NextResponse.json({ error: "not_in_household" }, { status: 404 })
  }

  let body: Partial<Subscription>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { name, amount, currency, billingCycle, nextChargeDate, category, card, owner } = body

  const { data, error } = await getSupabase()
    .from("subscriptions")
    .update({
      name,
      amount,
      currency,
      billing_cycle: billingCycle,
      next_charge_date: nextChargeDate,
      category,
      card,
      owner,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("household_id", householdId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(rowToSub(data as Record<string, unknown>))
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

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
    return NextResponse.json({ error: "not_in_household" }, { status: 404 })
  }

  const { error } = await getSupabase()
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
