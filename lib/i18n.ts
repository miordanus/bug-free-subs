/**
 * Minimal i18n module.
 *
 * Dictionaries:
 *   standard  – canonical English strings (always complete)
 *   ru        – partial Russian layer (infrastructure; extend as needed)
 *   fun_ru    – fun-mode overrides (applied on top when funMode is ON)
 *
 * Resolution order:
 *   funMode ON  → fun_ru → standard
 *   funMode OFF → standard
 *
 * The `ru` dict is wired into the fallback chain for future use; to activate
 * a full RU UI, change the OFF branch to: ru[key] ?? standard[key].
 */

export type StringKey =
  | "app.title"
  | "burn.title"
  | "burn.empty"
  | "upcoming.title"
  | "upcoming.empty"
  | "subs.title"
  | "subs.empty"
  | "btn.add"
  | "btn.exportCsv"
  | "btn.edit"
  | "btn.delete"
  | "btn.import"
  | "btn.importing"
  | "import.banner"
  | "cycle.monthly"
  | "cycle.yearly"
  | "form.addTitle"
  | "form.editTitle"
  | "form.submit.add"
  | "form.submit.save"
  | "form.submit.saving"
  | "form.field.name"
  | "form.field.amount"
  | "form.field.currency"
  | "form.field.billingCycle"
  | "form.field.nextChargeDate"
  | "form.field.category"
  | "form.field.card"
  | "form.field.owner"
  | "toggle.funMode"

type FullDict = Record<StringKey, string>
type PartialDict = Partial<FullDict>

// ── Standard (English) — always complete ─────────────────────────────────────

const standard: FullDict = {
  "app.title":               "Subscriptions",
  "burn.title":              "Monthly Burn",
  "burn.empty":              "— no subscriptions yet",
  "upcoming.title":          "Upcoming Charges",
  "upcoming.empty":          "— no upcoming charges",
  "subs.title":              "All Subscriptions",
  "subs.empty":              "— tap + Add to get started",
  "btn.add":                 "+ Add",
  "btn.exportCsv":           "Export CSV",
  "btn.edit":                "Edit",
  "btn.delete":              "Delete",
  "btn.import":              "Import",
  "btn.importing":           "Importing…",
  "import.banner":           "Found local data — import into Supabase?",
  "cycle.monthly":           "Monthly",
  "cycle.yearly":            "Annually",
  "form.addTitle":           "Add Subscription",
  "form.editTitle":          "Edit Subscription",
  "form.submit.add":         "Add Subscription",
  "form.submit.save":        "Save Changes",
  "form.submit.saving":      "Saving…",
  "form.field.name":         "Name",
  "form.field.amount":       "Amount",
  "form.field.currency":     "Currency",
  "form.field.billingCycle": "Billing Cycle",
  "form.field.nextChargeDate": "Next Charge Date",
  "form.field.category":     "Category",
  "form.field.card":         "Card",
  "form.field.owner":        "Owner",
  "toggle.funMode":          "Fun",
}

// ── Russian — partial, for future extension ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ru: PartialDict = {
  "app.title":      "Подписки",
  "burn.title":     "Расход в месяц",
  "upcoming.title": "Ближайшие платежи",
  "upcoming.empty": "— ничего не предвидится",
  "subs.empty":     "— нажми + добавить",
  "btn.add":        "+ Добавить",
  "toggle.funMode": "Весёлый",
}

// ── Fun-mode overlay ──────────────────────────────────────────────────────────

const fun_ru: PartialDict = {
  "app.title":      "подписечки",
  "burn.title":     "проёбочки",
  "upcoming.title": "бляяя",
  "subs.title":     "настроечки",
  "btn.exportCsv":  "жахни csv",
  "btn.edit":       "правим",
  "btn.delete":     "нах",
  "cycle.monthly":  "мес",
  "cycle.yearly":   "год",
  "toggle.funMode": "фан",
}

// ── Public helper ─────────────────────────────────────────────────────────────

export function t(key: StringKey, funMode: boolean): string {
  if (funMode) return fun_ru[key] ?? standard[key]
  return standard[key]
}
