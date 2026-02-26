import { Subscription, Currency } from "@/types/subscription"

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  RUB: "₽",
}

export type BurnSummary = Partial<Record<Currency, number>>

export function getBurnSummary(subs: Subscription[]): BurnSummary {
  const summary: BurnSummary = {}
  for (const sub of subs) {
    const monthly =
      sub.billingCycle === "monthly" ? sub.amount : sub.amount / 12
    summary[sub.currency] = (summary[sub.currency] ?? 0) + monthly
  }
  return summary
}

export function getUpcoming(subs: Subscription[]): Subscription[] {
  return [...subs]
    .sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate))
    .slice(0, 10)
}
