"use client"

import { Subscription } from "@/types/subscription"
import { getBurnSummary, CURRENCY_SYMBOL } from "@/lib/calculations"
import { t } from "@/lib/i18n"

type Props = {
  subs: Subscription[]
  funMode: boolean
}

export default function BurnSummary({ subs, funMode }: Props) {
  const summary = getBurnSummary(subs)
  const entries = Object.entries(summary) as [
    keyof typeof summary,
    number,
  ][]

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
      <p className="text-xs text-[#555] uppercase tracking-widest mb-4 font-mono">
        {t("burn.title", funMode)}
      </p>

      {entries.length === 0 ? (
        <p className="text-[#444] text-sm font-mono">
          {t("burn.empty", funMode)}
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
