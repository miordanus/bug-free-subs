import { NextRequest, NextResponse } from "next/server"
import * as crypto from "crypto"

/**
 * Normalize the initData string received from the client.
 *
 * Two formats arrive:
 *   "wrapper" — initData came from URL hash/search, Telegram wrapped the real
 *               initData as the value of tgWebAppData:
 *               "tgWebAppData=query_id%3D...%26hash%3D...&tgWebAppVersion=7.4&..."
 *   "raw"     — standard initData string already in query-string form:
 *               "query_id=...&user=...&auth_date=...&hash=..."
 *
 * Returns the unwrapped, decodable initData string and which path was taken.
 */
function normalizeInitData(raw: string): { realInitData: string; path: "wrapper" | "raw" } {
  // Strip any accidental leading '#' or '?'
  const stripped = raw.replace(/^[#?]/, "")

  if (stripped.includes("tgWebAppData=")) {
    // Extract the percent-encoded value without letting URLSearchParams
    // auto-decode it first — we want exactly one decodeURIComponent pass.
    const m = stripped.match(/(?:^|&)tgWebAppData=([^&]*)/)
    const encodedValue = m?.[1] ?? ""
    const realInitData = decodeURIComponent(encodedValue)
    return { realInitData, path: "wrapper" }
  }

  return { realInitData: stripped, path: "raw" }
}

export async function POST(req: NextRequest) {
  let body: { initData?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { initData } = body
  if (!initData || typeof initData !== "string") {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
  }

  const { realInitData, path } = normalizeInitData(initData)

  // Parse the real initData as a query string
  const params = new URLSearchParams(realInitData)
  const hash = params.get("hash")
  const hasHash = !!hash
  const hasAuthDate = params.has("auth_date")
  const hasUser = params.has("user")

  if (!hash) {
    return NextResponse.json(
      { error: "Missing hash in initData", debug: { path, has_hash: false, has_auth_date: hasAuthDate, has_user: hasUser } },
      { status: 401 }
    )
  }

  // Remove hash before building the check string
  params.delete("hash")

  // Build data_check_string: sorted key=value pairs joined by '\n'
  // URLSearchParams already decoded values, which matches what Telegram hashed
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()

  // computed_hash = HMAC-SHA256(data_check_string, secret_key) hex
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

  // Timing-safe comparison
  let match = false
  try {
    const hashBuf = Buffer.from(hash, "hex")
    const computedBuf = Buffer.from(computedHash, "hex")
    if (hashBuf.length === computedBuf.length) {
      match = crypto.timingSafeEqual(hashBuf, computedBuf)
    }
  } catch {
    match = false
  }

  if (!match) {
    return NextResponse.json(
      { error: "Invalid initData", debug: { path, has_hash: hasHash, has_auth_date: hasAuthDate, has_user: hasUser } },
      { status: 401 }
    )
  }

  // Extract user profile
  const userStr = params.get("user")
  if (!userStr) {
    return NextResponse.json({ error: "No user in initData" }, { status: 400 })
  }

  try {
    const user = JSON.parse(userStr) as {
      id: number
      username?: string
      first_name?: string
      last_name?: string
    }
    return NextResponse.json({
      telegram_user_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
    })
  } catch {
    return NextResponse.json({ error: "Invalid user JSON" }, { status: 400 })
  }
}
