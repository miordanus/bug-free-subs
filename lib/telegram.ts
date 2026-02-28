// SSR-safe helpers for Telegram Mini App

type TgWebApp = {
  initData?: string
  ready?: () => void
}

type TgWindow = Window & {
  Telegram?: { WebApp?: TgWebApp }
  TelegramWebviewProxy?: unknown
}

/**
 * Detect Telegram Mini App environment.
 * Returns true if ANY of the following signals are present:
 *   1. window.Telegram.WebApp object exists
 *   2. window.TelegramWebviewProxy exists (Telegram Desktop/macOS webview)
 *   3. URL search string contains tgWebAppData param
 *   4. URL hash string contains tgWebAppData param
 */
export function detectTelegramEnv(): boolean {
  if (typeof window === "undefined") return false
  const w = window as TgWindow
  if (w.Telegram?.WebApp) return true
  if (w.TelegramWebviewProxy) return true
  if (new URLSearchParams(window.location.search).has("tgWebAppData")) return true
  if (new URLSearchParams(window.location.hash.slice(1)).has("tgWebAppData")) return true
  return false
}

/**
 * Retrieve Telegram initData for server-side HMAC validation.
 * Priority:
 *   1. window.Telegram.WebApp.initData  (non-empty)
 *   2. URL search string (if tgWebAppData present) — strips leading '?'
 *   3. URL hash string  (if tgWebAppData present) — strips leading '#'
 * The resolved string is persisted to localStorage "tg_initData_v1".
 * Returns "" if no initData is found in any source.
 */
export function getTelegramInitData(): string {
  if (typeof window === "undefined") return ""

  const w = window as TgWindow

  // 1. WebApp object
  const fromWebApp = w.Telegram?.WebApp?.initData ?? ""
  if (fromWebApp) {
    localStorage.setItem("tg_initData_v1", fromWebApp)
    return fromWebApp
  }

  // 2. URL search (?tgWebAppData=...&...)
  const search = window.location.search
  if (search && new URLSearchParams(search).has("tgWebAppData")) {
    const result = search.slice(1) // strip leading '?'
    localStorage.setItem("tg_initData_v1", result)
    return result
  }

  // 3. URL hash (#tgWebAppData=...&...)
  const hash = window.location.hash
  if (hash && new URLSearchParams(hash.slice(1)).has("tgWebAppData")) {
    const result = hash.slice(1) // strip leading '#'
    localStorage.setItem("tg_initData_v1", result)
    return result
  }

  // 4. localStorage cache (populated on first successful retrieval above)
  const cached = localStorage.getItem("tg_initData_v1")
  if (cached) return cached

  return ""
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
