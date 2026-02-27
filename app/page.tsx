"use client"

import { useState, useEffect } from "react"
import { Subscription } from "@/types/subscription"
import { loadSubs } from "@/lib/storage"
import { callTelegramReady, getTelegramInitData } from "@/lib/telegram"
import BurnSummary from "@/components/BurnSummary"
import UpcomingList from "@/components/UpcomingList"
import SubscriptionList from "@/components/SubscriptionList"
import SubscriptionForm from "@/components/SubscriptionForm"

type AuthStatus =
  | "checking"
  | "authed"
  | "no_initdata"
  | "invalid_initdata"
  | "not_in_household"
  | "error"

type TgProfile = {
  telegram_user_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
}

type TgWindow = Window & { Telegram?: { WebApp?: unknown } }

/**
 * Detect Telegram Mini App environment independently from auth.
 * True if window.Telegram.WebApp exists OR URL carries tgWebApp* params.
 * Telegram Desktop may inject only URL params, not the JS object.
 */
function detectTelegramEnv(): boolean {
  if (typeof window === "undefined") return false
  if ((window as TgWindow).Telegram?.WebApp) return true
  const p = new URLSearchParams(window.location.search)
  return p.has("tgWebAppPlatform") || p.has("tgWebAppVersion")
}

const BOT_USERNAME = "subsion_bot"

export default function Home() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [monthLabel, setMonthLabel] = useState("")
  const [isDark, setIsDark] = useState(true)

  // null = pre-mount (not yet detected), true/false = result of detectTelegramEnv()
  const [isTgEnv, setIsTgEnv] = useState<boolean | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking")
  const [tgProfile, setTgProfile] = useState<TgProfile | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [householdName, setHouseholdName] = useState<string | null>(null)

  // Debug state
  const [initDataLength, setInitDataLength] = useState<number | null>(null)
  const [lastAuthHttpStatus, setLastAuthHttpStatus] = useState<number | null>(null)

  // localStorage import
  const [localImportReady, setLocalImportReady] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setMounted(true)
    setMonthLabel(
      new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
    )
    const savedTheme = localStorage.getItem("theme")
    setIsDark(savedTheme !== "light")

    // A) Telegram environment detection — independent from auth
    const tgEnv = detectTelegramEnv()
    setIsTgEnv(tgEnv)

    if (!tgEnv) return // gate will render based on isTgEnv=false

    callTelegramReady()
    const initData = getTelegramInitData()
    setInitDataLength(initData.length)

    // B) Empty initData — Telegram Desktop reality
    if (initData === "") {
      setAuthStatus("no_initdata")
      return
    }

    const localSubs = loadSubs()
    if (localSubs.length > 0) setLocalImportReady(true)

    // B) Non-empty initData — validate server-side
    ;(async () => {
      try {
        const authRes = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        })
        setLastAuthHttpStatus(authRes.status)

        if (!authRes.ok) {
          setAuthStatus("invalid_initdata")
          return
        }

        const profile: TgProfile = await authRes.json()
        setTgProfile(profile)
        const uid = profile.telegram_user_id

        // C) Household resolution
        const meRes = await fetch("/api/me", {
          headers: { "x-telegram-user-id": String(uid) },
        })
        if (!meRes.ok) {
          setAuthStatus("not_in_household")
          return
        }
        const meData = await meRes.json()
        setHouseholdId(meData.household_id)
        setHouseholdName(meData.household_name)

        // Load subscriptions
        const subsRes = await fetch("/api/subscriptions", {
          headers: { "x-telegram-user-id": String(uid) },
        })
        if (subsRes.ok) setSubs(await subsRes.json())

        setAuthStatus("authed")
      } catch (err) {
        console.error("Telegram init failed:", err)
        setAuthStatus("error")
      }
    })()
  }, [])

  // ── API helpers ──────────────────────────────────────────────────────────────

  function apiHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "x-telegram-user-id": String(tgProfile?.telegram_user_id ?? ""),
    }
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────────

  async function handleSave(sub: Subscription) {
    if (!tgProfile) return
    try {
      if (editing) {
        const res = await fetch(`/api/subscriptions/${sub.id}`, {
          method: "PATCH",
          headers: apiHeaders(),
          body: JSON.stringify(sub),
        })
        if (res.ok) {
          const updated: Subscription = await res.json()
          setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _ignored, ...payload } = sub
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created: Subscription = await res.json()
          setSubs((prev) => [...prev, created])
        }
      }
    } catch (err) {
      console.error("Save failed:", err)
    }
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!tgProfile) return
    if (!confirm("Delete this subscription?")) return
    try {
      await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
        headers: { "x-telegram-user-id": String(tgProfile.telegram_user_id) },
      })
      setSubs((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  // ── Import from localStorage ──────────────────────────────────────────────────

  async function handleImport() {
    if (!tgProfile || importing) return
    const localSubs = loadSubs()
    if (localSubs.length === 0) {
      setLocalImportReady(false)
      return
    }
    setImporting(true)
    try {
      for (const sub of localSubs) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _ignored, ...payload } = sub
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify(payload),
        })
      }
      const subsRes = await fetch("/api/subscriptions", {
        headers: { "x-telegram-user-id": String(tgProfile.telegram_user_id) },
      })
      if (subsRes.ok) setSubs(await subsRes.json())
      setLocalImportReady(false)
      if (confirm(`Imported ${localSubs.length} subscription(s). Clear localStorage data?`)) {
        localStorage.removeItem("subs_v2")
        localStorage.removeItem("subs_v1")
      }
    } catch (err) {
      console.error("Import failed:", err)
    } finally {
      setImporting(false)
    }
  }

  // ── Theme toggle ─────────────────────────────────────────────────────────────

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
      s.name, s.amount, s.currency, s.billingCycle, s.nextChargeDate, s.category, s.card, s.owner,
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

  function handleAdd() { setEditing(null); setModalOpen(true) }
  function handleEdit(sub: Subscription) { setEditing(sub); setModalOpen(true) }
  function handleClose() { setModalOpen(false); setEditing(null) }

  // ── Debug footer ──────────────────────────────────────────────────────────────

  const debugFooter = (
    <div className="text-center text-[10px] font-mono text-[#333] pb-2 pt-6 space-y-0.5">
      <p>
        env:{isTgEnv === null ? "?" : isTgEnv ? "tg" : "web"}
        {" · "}initData:{initDataLength ?? "?"}
        {" · "}auth:{authStatus}
        {" · "}http:{lastAuthHttpStatus ?? "-"}
      </p>
      {(householdName ?? householdId) && (
        <p>Household: {householdName ?? householdId}</p>
      )}
    </div>
  )

  // ── D) Loading: pre-mount or env not yet detected ─────────────────────────────

  if (!mounted || isTgEnv === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex items-center justify-center">
        <p className="text-sm font-mono text-[#555]">Loading…</p>
      </div>
    )
  }

  // ── A) Gate: not in Telegram environment ──────────────────────────────────────

  if (!isTgEnv) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-mono text-[#555] text-center px-8">
          Open this app from Telegram: @{BOT_USERNAME}
        </p>
        {debugFooter}
      </div>
    )
  }

  // ── D) Auth in progress ───────────────────────────────────────────────────────

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-mono text-[#555]">Authenticating…</p>
        {debugFooter}
      </div>
    )
  }

  // ── B) no_initdata — Telegram Desktop without initData ────────────────────────

  if (authStatus === "no_initdata") {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-sm font-mono text-[#888] text-center leading-relaxed">
          Telegram Desktop may not provide initData.
          <br />
          Use mobile Telegram OR link your account via bot.
        </p>
        <a
          href={`https://t.me/${BOT_USERNAME}?start=link`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-black bg-[#00FF85] px-4 py-2 rounded-lg"
        >
          Link via bot
        </a>
        {debugFooter}
      </div>
    )
  }

  // ── B) invalid_initdata — hash mismatch / session expired ─────────────────────

  if (authStatus === "invalid_initdata") {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-sm font-mono text-[#888] text-center">
          Session expired. Reopen from bot.
        </p>
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-black bg-[#00FF85] px-4 py-2 rounded-lg"
        >
          Open @{BOT_USERNAME}
        </a>
        {debugFooter}
      </div>
    )
  }

  // ── C) not_in_household — authenticated but no household membership ────────────

  if (authStatus === "not_in_household") {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-sm font-mono text-[#888] text-center leading-relaxed">
          Your account is not linked to a household.
          <br />
          Share your Telegram user ID with an admin.
        </p>
        {tgProfile && (
          <p className="text-xs font-mono text-[#555] text-center">
            Your ID:{" "}
            <span className="text-[#888] select-all">{tgProfile.telegram_user_id}</span>
          </p>
        )}
        {debugFooter}
      </div>
    )
  }

  // ── Generic error ─────────────────────────────────────────────────────────────

  if (authStatus === "error") {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-2 px-8">
        <p className="text-sm font-mono text-[#555] text-center">
          Something went wrong. Please close and reopen the app.
        </p>
        {debugFooter}
      </div>
    )
  }

  // ── C/D) Main app — authStatus === "authed" ───────────────────────────────────

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
            <button
              onClick={exportCSV}
              disabled={subs.length === 0}
              className="text-xs font-mono text-[#555] border border-[var(--border)] px-3 py-1.5 rounded-lg hover:border-[#444] transition-colors disabled:opacity-30"
            >
              Export CSV
            </button>
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
        {localImportReady && (
          <div className="border border-[var(--border)] rounded-lg p-3 flex items-center justify-between gap-3">
            <p className="text-xs font-mono text-[#888]">
              Found local data — import into Supabase?
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="text-xs font-mono text-black bg-[#00FF85] px-3 py-1.5 rounded-lg disabled:opacity-50 shrink-0"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        )}
        <BurnSummary subs={subs} />
        <UpcomingList subs={subs} />
        <SubscriptionList
          subs={subs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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

      {/* Debug footer */}
      {debugFooter}
    </div>
  )
}
