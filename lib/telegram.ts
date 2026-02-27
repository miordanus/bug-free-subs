// SSR-safe helpers for Telegram Mini App

type TgWebApp = {
  initData?: string
  ready?: () => void
}

type TgWindow = Window & { Telegram?: { WebApp?: TgWebApp } }

export function isTelegramWebApp(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as TgWindow).Telegram?.WebApp
}

export function getTelegramInitData(): string {
  if (typeof window === "undefined") return ""
  return (window as TgWindow).Telegram?.WebApp?.initData ?? ""
}

// Optional helper to read WebApp user for debug (does NOT validate — never trust client-side)
export function getTelegramWebAppUserUnsafe(): unknown | null {
  if (typeof window === "undefined") return null
  const initData = (window as TgWindow).Telegram?.WebApp?.initData
  if (!initData) return null
  try {
    const params = new URLSearchParams(initData)
    const user = params.get("user")
    if (!user) return null
    return JSON.parse(user)
  } catch {
    return null
  }
}

export function callTelegramReady(): void {
  if (typeof window === "undefined") return
  ;(window as TgWindow).Telegram?.WebApp?.ready?.()
}
