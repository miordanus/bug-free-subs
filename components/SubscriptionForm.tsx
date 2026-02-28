"use client"

import { useState } from "react"
import { Subscription, Currency, BillingCycle, Owner } from "@/types/subscription"
import { t } from "@/lib/i18n"
import { displayOwner } from "@/lib/ownerLabels"

type Props = {
  initial: Subscription | null
  funMode: boolean
  ownerLabels: Record<string, string>
  onSave: (sub: Subscription) => Promise<string | null>
  onClose: () => void
}

type FormState = {
  name: string
  amount: string
  currency: Currency
  billingCycle: BillingCycle
  nextChargeDate: string
  category: string
  card: string
  owner: Owner
}

type FormErrors = Partial<Record<keyof FormState, string>>

const INPUT =
  "w-full bg-[var(--bg-input)] border border-[var(--input-border)] text-[var(--text)] px-3 py-3 rounded-lg text-sm focus:outline-none focus:border-[#00FF85] transition-colors font-mono placeholder:text-[#555] appearance-none"
const LABEL =
  "block text-[10px] text-[#555] mb-1.5 uppercase tracking-widest font-mono"

export default function SubscriptionForm({ initial, funMode, ownerLabels, onSave, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? "",
    amount: initial?.amount.toString() ?? "",
    currency: initial?.currency ?? "EUR",
    billingCycle: initial?.billingCycle ?? "monthly",
    nextChargeDate: initial?.nextChargeDate ?? today,
    category: initial?.category ?? "",
    card: initial?.card ?? "",
    owner: initial?.owner ?? "me",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = "Name is required"
    if (!form.amount || parseFloat(form.amount) <= 0)
      e.amount = "Must be > 0"
    if (!form.nextChargeDate) e.nextChargeDate = "Date is required"
    if (form.owner !== "me" && form.owner !== "wife") e.owner = "Select an owner"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const sub: Subscription = {
      id: initial?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      billingCycle: form.billingCycle,
      nextChargeDate: form.nextChargeDate,
      category: form.category.trim(),
      card: form.card.trim(),
      owner: form.owner,
    }
    console.log("Saving owner:", sub.owner)
    setSaving(true)
    setSaveError(null)
    const err = await onSave(sub)
    // If null, page.tsx closed the modal already (component unmounting — safe no-op).
    // If error string, re-enable form and show message.
    setSaving(false)
    if (err) setSaveError(err)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[92dvh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-card)] z-10">
          <h2 className="text-sm font-bold tracking-tight">
            {initial ? t("form.editTitle", funMode) : t("form.addTitle", funMode)}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#555] hover:text-[var(--text)] transition-colors w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}>
          {/* Name */}
          <div>
            <label className={LABEL}>{t("form.field.name", funMode)}</label>
            <input
              type="text"
              className={INPUT}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Netflix"
              autoFocus
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1 font-mono">{errors.name}</p>
            )}
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t("form.field.amount", funMode)}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={INPUT}
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="9.99"
              />
              {errors.amount && (
                <p className="text-red-400 text-xs mt-1 font-mono">
                  {errors.amount}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL}>{t("form.field.currency", funMode)}</label>
              <select
                className={INPUT}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as Currency)}
              >
                <option value="EUR">EUR — €</option>
                <option value="USD">USD — $</option>
                <option value="RUB">RUB — ₽</option>
              </select>
            </div>
          </div>

          {/* Billing Cycle */}
          <div>
            <label className={LABEL}>{t("form.field.billingCycle", funMode)}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "yearly"] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => set("billingCycle", cycle)}
                  className={`py-3 text-xs font-mono uppercase tracking-wider rounded-lg border transition-colors ${
                    form.billingCycle === cycle
                      ? "bg-[#00FF85] text-black border-[#00FF85]"
                      : "bg-[var(--bg-page)] text-[#555] border-[var(--input-border)] hover:border-[#444]"
                  }`}
                >
                  {cycle === "monthly" ? t("cycle.monthly", funMode) : t("cycle.yearly", funMode)}
                </button>
              ))}
            </div>
          </div>

          {/* Next Charge Date */}
          <div>
            <label className={LABEL}>{t("form.field.nextChargeDate", funMode)}</label>
            <input
              type="date"
              className={INPUT}
              value={form.nextChargeDate}
              onChange={(e) => set("nextChargeDate", e.target.value)}
            />
            {errors.nextChargeDate && (
              <p className="text-red-400 text-xs mt-1 font-mono">
                {errors.nextChargeDate}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className={LABEL}>{t("form.field.category", funMode)}</label>
            <input
              type="text"
              className={INPUT}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Entertainment"
            />
          </div>

          {/* Card */}
          <div>
            <label className={LABEL}>{t("form.field.card", funMode)}</label>
            <input
              type="text"
              className={INPUT}
              value={form.card}
              onChange={(e) => set("card", e.target.value)}
              placeholder="Visa *4242"
            />
          </div>

          {/* Owner */}
          <div>
            <label className={LABEL}>{t("form.field.owner", funMode)}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["me", "wife"] as const).map((value) => {
                const isSelected = form.owner === value
                const dotColor = value === "me" ? "bg-white" : "bg-[#FF6B9D]"
                const selectedCls =
                  value === "me"
                    ? "bg-white/10 border-white/50 text-[var(--text)]"
                    : "bg-[#FF6B9D]/15 border-[#FF6B9D] text-[var(--text)]"
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("owner", value)}
                    className={`py-3 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      isSelected
                        ? selectedCls
                        : "bg-[var(--bg-page)] text-[#555] border-[var(--input-border)] hover:border-[#444]"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? dotColor : "bg-[#333]"}`}
                    />
                    {displayOwner(value, ownerLabels)}
                  </button>
                )
              })}
            </div>
            {errors.owner && (
              <p className="text-red-400 text-xs mt-1 font-mono">{errors.owner}</p>
            )}
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-red-400 text-xs font-mono text-center px-3 py-2 bg-red-950/30 rounded-lg">
              {saveError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#00FF85] text-black font-bold text-sm uppercase tracking-wider py-4 rounded-xl mt-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saving
              ? t("form.submit.saving", funMode)
              : initial
              ? t("form.submit.save", funMode)
              : t("form.submit.add", funMode)}
          </button>
        </form>
      </div>
    </div>
  )
}
