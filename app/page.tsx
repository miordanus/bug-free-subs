"use client"

import { useState, useEffect, useCallback } from "react"
import { Subscription } from "@/types/subscription"
import { loadSubs, saveSubs } from "@/lib/storage"
import BurnSummary from "@/components/BurnSummary"
import UpcomingList from "@/components/UpcomingList"
import SubscriptionList from "@/components/SubscriptionList"
import SubscriptionForm from "@/components/SubscriptionForm"

export default function Home() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [monthLabel, setMonthLabel] = useState("")
  const [isDark, setIsDark] = useState(true)

  // Load from localStorage only after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setSubs(loadSubs())
    setMounted(true)
    setMonthLabel(
      new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    )
    const saved = localStorage.getItem("theme")
    setIsDark(saved !== "light")
  }, [])

  const persist = useCallback((updated: Subscription[]) => {
    setSubs(updated)
    saveSubs(updated)
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    const html = document.documentElement
    if (next) {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  function exportCSV() {
    const headers = ["Name", "Amount", "Currency", "Billing Cycle", "Next Charge", "Category", "Card", "Owner"]
    const rows = subs.map((s) => [
      s.name,
      s.amount,
      s.currency,
      s.billingCycle,
      s.nextChargeDate,
      s.category,
      s.card,
      s.owner,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function handleEdit(sub: Subscription) {
    setEditing(sub)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this subscription?")) return
    persist(subs.filter((s) => s.id !== id))
  }

  function handleSave(sub: Subscription) {
    if (editing) {
      persist(subs.map((s) => (s.id === editing.id ? sub : s)))
    } else {
      persist([...subs, sub])
    }
    setModalOpen(false)
    setEditing(null)
  }

  function handleClose() {
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] pb-28">
      {/* Header */}
      <header className="px-4 pt-12 pb-6 max-w-xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-xs text-[#444] mt-1 font-mono uppercase tracking-widest">
              {monthLabel || "\u00A0"}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {mounted && (
              <button
                onClick={exportCSV}
                disabled={subs.length === 0}
                className="text-xs font-mono text-[#555] border border-[var(--border)] px-3 py-1.5 rounded-lg hover:border-[#444] transition-colors disabled:opacity-30"
              >
                Export CSV
              </button>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-base border border-[var(--border)] w-9 h-9 flex items-center justify-center rounded-lg hover:border-[#444] transition-colors"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 space-y-3 max-w-xl mx-auto">
        {mounted ? (
          <>
            <BurnSummary subs={subs} />
            <UpcomingList subs={subs} />
            <SubscriptionList
              subs={subs}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        ) : (
          // Skeleton while loading from localStorage
          <div className="space-y-3">
            {[120, 280, 200].map((h, i) => (
              <div
                key={i}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse"
                style={{ height: h }}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={handleAdd}
        aria-label="Add subscription"
        className="fixed bottom-6 right-6 bg-[#00FF85] text-black font-bold text-sm uppercase tracking-wider px-6 py-4 rounded-xl z-40 active:scale-95 transition-transform shadow-none min-w-[100px]"
      >
        + Add
      </button>

      {/* Modal */}
      {modalOpen && (
        <SubscriptionForm
          initial={editing}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
