import { Subscription } from "@/types/subscription"

const KEY = "subs_v1"

export function loadSubs(): Subscription[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Subscription[]
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
