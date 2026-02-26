"use client"

import { Subscription } from "@/types/subscription"
import { getBurnSummary, CURRENCY_SYMBOL } from "@/lib/calculations"

type Props = {
  subs: Subscription[]
}

export default function BurnSummary({ subs }: Props) {
  const summary = getBurnSummary(subs)
  const entries = Object.entries(summary) as [
    keyof typeof summary,
    number,
  ][]

  return (
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-5">
      <p className="text-xs text-[#555] uppercase tracking-widest mb-4 font-mono">
        Monthly Burn
      </p>

      {entries.length === 0 ? (
        <p className="text-[#444] text-sm font-mono">
          — no subscriptions yet
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(([currency, amount]) => (
            <div
              key={currency}
              className="flex items-baseline justify-between"
            >
              <span className="text-xs text-[#555] font-mono uppercase tracking-widest">
                {currency}
              </span>
              <span className="text-4xl font-mono text-[#00FF85] tabular-nums leading-none">
                {CURRENCY_SYMBOL[currency]}
                {amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
