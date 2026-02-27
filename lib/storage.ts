import { Subscription } from "@/types/subscription"

const KEY_V1 = "subs_v1"
const KEY = "subs_v2"

function migrateV1(raw: string): Subscription[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((s: Record<string, unknown>) => ({
      ...s,
      owner: s.owner === "me" ? "max" : s.owner === "wife" ? "molly" : s.owner,
    })) as Subscription[]
  } catch {
    return []
  }
}

export function loadSubs(): Subscription[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed as Subscription[]
    }
    // Check for v1 data and migrate
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const migrated = migrateV1(rawV1)
      localStorage.setItem(KEY, JSON.stringify(migrated))
      localStorage.removeItem(KEY_V1)
      return migrated
    }
    return []
  } catch {
    return []
  }
}

export function saveSubs(subs: Subscription[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(subs))
  } catch {
    // localStorage unavailable — fail silently
  }
}
