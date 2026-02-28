"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHouseholdSettings, OwnerLabels } from "@/hooks/useHouseholdSettings"

const INPUT =
  "w-full bg-[var(--bg-input)] border border-[var(--input-border)] text-[var(--text)] px-3 py-3 rounded-lg text-sm focus:outline-none focus:border-[#00FF85] transition-colors font-mono placeholder:text-[#555] appearance-none"
const LABEL =
  "block text-[10px] text-[#555] mb-1.5 uppercase tracking-widest font-mono"

// Isolated sub-component so its useState is initialized fresh when key changes
function OwnerForm({
  defaultMe,
  defaultWife,
  onSave,
}: {
  defaultMe: string
  defaultWife: string
  onSave: (labels: OwnerLabels) => Promise<void>
}) {
  const [meLabel, setMeLabel] = useState(defaultMe)
  const [wifeLabel, setWifeLabel] = useState(defaultWife)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await onSave({ me: meLabel.trim() || "Max", wife: wifeLabel.trim() || "Molly" })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div>
        <label className={LABEL}>Label for &ldquo;me&rdquo;</label>
        <input
          type="text"
          className={INPUT}
          value={meLabel}
          onChange={(e) => setMeLabel(e.target.value)}
          placeholder="Max"
        />
      </div>
      <div>
        <label className={LABEL}>Label for &ldquo;wife&rdquo;</label>
        <input
          type="text"
          className={INPUT}
          value={wifeLabel}
          onChange={(e) => setWifeLabel(e.target.value)}
          placeholder="Molly"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#00FF85] text-black font-bold text-sm uppercase tracking-wider py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const stored = localStorage.getItem("tg_user_id")
    if (!stored) return
    const parsed = parseInt(stored, 10)
    if (!isNaN(parsed)) setTelegramUserId(parsed)
  }, [])

  const { ownerLabels, updateOwnerLabels } = useHouseholdSettings(telegramUserId)

  // key changes when server data loads (different from defaults), forcing OwnerForm to remount
  const formKey = `${ownerLabels.me}:${ownerLabels.wife}`

  // Prevent SSR / first-paint from showing "wrong context" message
  if (!mounted) {
    return <div className="min-h-screen bg-[var(--bg-page)]" />
  }

  if (!telegramUserId) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] flex flex-col items-center justify-center gap-3 px-8">
        <p className="text-sm font-mono text-[#555] text-center">
          Please open settings from the main app.
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-xs font-mono text-black bg-[#00FF85] px-4 py-2 rounded-lg"
        >
          Go to app
        </button>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[var(--bg-page)] text-[var(--text)]"
      style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Header */}
      <header
        className="px-4 pb-4 max-w-xl mx-auto flex items-center gap-3"
        style={{ paddingTop: "max(3rem, env(safe-area-inset-top, 3rem))" }}
      >
        <button
          onClick={() => router.push("/")}
          aria-label="Back"
          className="text-sm font-mono text-[#555] border border-[var(--border)] px-3 py-1.5 rounded-lg hover:border-[#444] transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </header>

      {/* Content */}
      <main className="px-4 max-w-xl mx-auto space-y-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <p className="text-xs text-[#555] uppercase tracking-widest font-mono">Owners</p>
          <OwnerForm
            key={formKey}
            defaultMe={ownerLabels.me ?? "Max"}
            defaultWife={ownerLabels.wife ?? "Molly"}
            onSave={updateOwnerLabels}
          />
        </div>
      </main>
    </div>
  )
}
