"use client"

import { useState } from "react"
import { Subscription, Owner } from "@/types/subscription"
import { CURRENCY_SYMBOL } from "@/lib/calculations"
import { t } from "@/lib/i18n"
import { displayOwner } from "@/lib/ownerLabels"

type Props = {
  subs: Subscription[]
  funMode: boolean
  ownerLabels: Record<string, string>
  onEdit: (sub: Subscription) => void
  onDelete: (id: string) => void
}

function OwnerBadge({ owner, ownerLabels }: { owner: Owner; ownerLabels: Record<string, string> }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-mono leading-tight ${
        owner === "me"
          ? "bg-[var(--owner-max-bg)] text-[var(--owner-max-text)]"
          : "bg-[#FF6B9D]/20 text-[#FF6B9D]"
      }`}
    >
      {displayOwner(owner, ownerLabels)}
    </span>
  )
}

export default function SubscriptionList({ subs, funMode, ownerLabels, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 pt-5 pb-3 flex items-center justify-between"
      >
        <p className="text-xs text-[#555] uppercase tracking-widest font-mono">
          {t("subs.title", funMode)}
          <span className="ml-2 text-[#333]">({subs.length})</span>
        </p>
        <svg
          className={`w-3 h-3 text-[#555] transition-transform duration-300 shrink-0 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
      {subs.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-[#444] text-sm font-mono">
            {t("subs.empty", funMode)}
          </p>
        </div>
      ) : (
        <div>
          {subs.map((sub) => (
            <div
              key={sub.id}
              className="px-5 py-4 border-b border-[var(--border)] last:border-b-0"
            >
              {/* Top row: name + amount */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-bold text-sm leading-tight">{sub.name}</p>
                  <p className="text-[11px] text-[#444] mt-0.5 font-mono truncate">
                    {[sub.category, sub.card].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[#00FF85] tabular-nums text-sm leading-tight">
                    {CURRENCY_SYMBOL[sub.currency]}
                    {sub.amount.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[#444] font-mono mt-0.5">
                    {sub.billingCycle}
                  </p>
                </div>
              </div>

              {/* Bottom row: owner + date + actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <OwnerBadge owner={sub.owner} ownerLabels={ownerLabels} />
                  <span className="text-[11px] text-[#333] font-mono">
                    {sub.nextChargeDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(sub)}
                    className="text-xs text-[#555] hover:text-[var(--text)] transition-colors px-3 py-1.5 border border-[var(--border)] rounded-lg active:scale-95"
                  >
                    {t("btn.edit", funMode)}
                  </button>
                  <button
                    onClick={() => onDelete(sub.id)}
                    className="text-xs text-[#555] hover:text-red-400 transition-colors px-3 py-1.5 border border-[var(--border)] rounded-lg active:scale-95"
                  >
                    {t("btn.delete", funMode)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
