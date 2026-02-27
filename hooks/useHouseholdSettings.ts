"use client"

import { useState, useEffect } from "react"

export type OwnerLabels = Record<string, string>

export const DEFAULT_OWNER_LABELS: OwnerLabels = { me: "Max", wife: "Molly" }

export function useHouseholdSettings(telegramUserId: number | null) {
  const [ownerLabels, setOwnerLabels] = useState<OwnerLabels>(DEFAULT_OWNER_LABELS)

  useEffect(() => {
    if (!telegramUserId) return
    fetch("/api/household/settings", {
      headers: { "x-telegram-user-id": String(telegramUserId) },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ownerLabels) setOwnerLabels(data.ownerLabels as OwnerLabels)
      })
      .catch(() => {})
  }, [telegramUserId])

  async function updateOwnerLabels(labels: OwnerLabels): Promise<void> {
    if (!telegramUserId) return
    setOwnerLabels(labels) // Optimistic update
    try {
      const res = await fetch("/api/household/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-user-id": String(telegramUserId),
        },
        body: JSON.stringify({ ownerLabels: labels }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.ownerLabels) setOwnerLabels(data.ownerLabels as OwnerLabels)
      }
    } catch {
      // keep optimistic value
    }
  }

  return { ownerLabels, updateOwnerLabels }
}
