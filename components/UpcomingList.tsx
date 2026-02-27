"use client"

import { Subscription, Owner } from "@/types/subscription"
import { getUpcoming, CURRENCY_SYMBOL } from "@/lib/calculations"

type Props = {
  subs: Subscription[]
}

function formatDate(dateStr: string): string {
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function OwnerBadge({ owner }: { owner: Owner }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-mono leading-tight ${
        owner === "me"
          ? "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/60"
          : "bg-[#FF6B9D]/20 text-[#FF6B9D]"
      }`}
    >
      {owner === "me" ? "Max" : "Molly"}
    </span>
  )
}

export default function UpcomingList({ subs }: Props) {
  const upcoming = getUpcoming(subs)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs text-[#555] uppercase tracking-widest font-mono">
          Upcoming Charges
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-[#444] text-sm font-mono">— no upcoming charges</p>
        </div>
      ) : (
        <div>
          {upcoming.map((sub) => (
            <div
              key={sub.id}
              className="px-5 py-3 border-b border-[var(--border)] last:border-b-0 flex items-center gap-3"
            >
              {/* Date — left, monospace */}
              <span className="text-xs font-mono text-[#555] w-14 shrink-0 tabular-nums">
                {formatDate(sub.nextChargeDate)}
              </span>

              {/* Name + meta — center */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-tight">
                  {sub.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <OwnerBadge owner={sub.owner} />
                  {sub.category ? (
                    <span className="text-[10px] text-[#444] font-mono truncate">
                      {sub.category}
                    </span>
                  ) : null}
                  {sub.card ? (
                    <span className="text-[10px] text-[#333] font-mono truncate">
                      {sub.card}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Amount — right, accent */}
              <span className="text-sm font-mono text-[#00FF85] shrink-0 tabular-nums">
                {CURRENCY_SYMBOL[sub.currency]}
                {sub.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
