"use client"

import { Subscription } from "@/types/subscription"
import { CURRENCY_SYMBOL } from "@/lib/calculations"

type Props = {
  subs: Subscription[]
  onEdit: (sub: Subscription) => void
  onDelete: (id: string) => void
}

function OwnerBadge({ owner }: { owner: "max" | "molly" }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-mono leading-tight ${
        owner === "max"
          ? "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/60"
          : "bg-[#FF6B9D]/20 text-[#FF6B9D]"
      }`}
    >
      {owner}
    </span>
  )
}

export default function SubscriptionList({ subs, onEdit, onDelete }: Props) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs text-[#555] uppercase tracking-widest font-mono">
          All Subscriptions
          <span className="ml-2 text-[#333]">({subs.length})</span>
        </p>
      </div>

      {subs.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-[#444] text-sm font-mono">
            — tap + Add to get started
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
                  <OwnerBadge owner={sub.owner} />
                  <span className="text-[11px] text-[#333] font-mono">
                    {sub.nextChargeDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(sub)}
                    className="text-xs text-[#555] hover:text-[var(--text)] transition-colors px-3 py-1.5 border border-[var(--border)] rounded-lg active:scale-95"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(sub.id)}
                    className="text-xs text-[#555] hover:text-red-400 transition-colors px-3 py-1.5 border border-[var(--border)] rounded-lg active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
