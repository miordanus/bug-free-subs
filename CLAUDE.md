# CLAUDE.md — SubTracker (bug-free-subs)

This file provides guidance for AI assistants (Claude Code and others) working in this repository.

---

## Project Overview

**SubTracker** is a dark-themed, mobile-optimised subscription management Telegram Mini App built for a couple ("Max" and "Molly"). It tracks recurring charges, shows monthly burn rates per currency, and lists upcoming payments.

**Architecture**: The app runs exclusively as a Telegram Mini App (`@subsion_bot`). Telegram authentication is validated server-side (HMAC), and data is stored in **Supabase** (PostgreSQL), scoped to a household. A legacy localStorage fallback exists only for migrating old data into Supabase.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 (utility classes only, no component library) |
| Fonts | Geist Sans + Geist Mono (via `geist` npm package) |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Auth | Telegram Mini App initData HMAC validation |
| Linting | ESLint 9 with `eslint-config-next` |
| Build | `next build` / `next dev` |

No test framework is configured.

---

## Directory Structure

```
bug-free-subs/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── telegram/route.ts   # POST — HMAC-validate Telegram initData
│   │   ├── me/route.ts             # GET  — resolve household for a Telegram user
│   │   └── subscriptions/
│   │       ├── route.ts            # GET (list), POST (create)
│   │       └── [id]/route.ts       # PATCH (update), DELETE
│   ├── layout.tsx                  # Root layout: fonts, theme-flash prevention
│   ├── page.tsx                    # Main page: env detection, auth, state, CRUD
│   └── globals.css                 # Tailwind import + CSS variables (light + dark)
├── components/
│   ├── BurnSummary.tsx             # Monthly spend totals grouped by currency
│   ├── UpcomingList.tsx            # Next 10 upcoming charges (chronological)
│   ├── SubscriptionList.tsx        # Full list with edit/delete actions
│   └── SubscriptionForm.tsx        # Add/edit modal (bottom-sheet on mobile)
├── lib/
│   ├── storage.ts                  # loadSubs() / saveSubs() — localStorage adapter (migration only)
│   ├── calculations.ts             # getBurnSummary(), getUpcoming(), CURRENCY_SYMBOL
│   ├── supabaseServer.ts           # SERVER ONLY — Supabase client + getHouseholdId()
│   └── telegram.ts                 # Client-side Telegram Mini App helpers (SSR-safe)
├── types/
│   └── subscription.ts             # Core types: Subscription, Currency, BillingCycle, Owner
├── public/                         # Static assets (SVGs, favicon)
├── next.config.ts                  # Minimal Next.js config
├── tsconfig.json                   # TypeScript config (strict, path alias @/*)
├── eslint.config.mjs               # ESLint config (next/core-web-vitals, typescript)
└── postcss.config.mjs              # PostCSS config (@tailwindcss/postcss)
```

---

## Environment Variables

The following environment variables must be set (e.g. in `.env.local`):

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather; used for HMAC validation of initData |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-only; **never expose to the browser**) |

---

## Core Data Model

Defined in `types/subscription.ts`:

```typescript
export type Currency     = "EUR" | "USD" | "RUB"
export type BillingCycle = "monthly" | "yearly"
export type Owner        = "me" | "wife"   // DB values; UI labels are "Max" / "Molly"

export type Subscription = {
  id:             string   // UUID (from Supabase or crypto.randomUUID())
  name:           string
  amount:         number   // float
  currency:       Currency
  billingCycle:   BillingCycle
  nextChargeDate: string   // ISO date: YYYY-MM-DD
  category:       string   // free-text, e.g. "Entertainment"
  card:           string   // free-text, e.g. "Visa *4242"
  owner:          Owner
}
```

**UI labels vs DB values**: The form shows "Max" / "Molly" but stores/sends `"me"` / `"wife"`. These are the canonical DB values.

---

## Supabase Database Schema

The API routes use these tables (snake_case column names):

### `subscriptions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `household_id` | uuid | FK to `households` |
| `created_by_telegram_user_id` | bigint | Telegram user who created the row |
| `name` | text | |
| `amount` | numeric | |
| `currency` | text | `"EUR"` / `"USD"` / `"RUB"` |
| `billing_cycle` | text | `"monthly"` / `"yearly"` |
| `next_charge_date` | text | ISO date `YYYY-MM-DD` |
| `category` | text | |
| `card` | text | |
| `owner` | text | `"me"` / `"wife"` |
| `updated_at` | timestamptz | Set on PATCH |

### `household_members`
| Column | Type | Notes |
|---|---|---|
| `telegram_user_id` | bigint | Telegram numeric user ID |
| `household_id` | uuid | FK to `households` |

### `households`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Display name |

**Column name mapping**: JavaScript uses camelCase (`billingCycle`, `nextChargeDate`); the DB uses snake_case (`billing_cycle`, `next_charge_date`). The `rowToSub()` helper in each route handles the conversion.

---

## API Routes

All routes (except `/api/auth/telegram`) require the `x-telegram-user-id` header containing the authenticated user's numeric Telegram ID.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/telegram` | Validates Telegram `initData` via HMAC-SHA256. Returns `{telegram_user_id, username, first_name, last_name}`. |
| `GET` | `/api/me` | Returns `{household_id, household_name}` for the authenticated user or 404. |
| `GET` | `/api/subscriptions` | Returns all subscriptions for the user's household, ordered by `next_charge_date`. |
| `POST` | `/api/subscriptions` | Creates a new subscription. Body: `Subscription` (excluding `id`). Returns 201 + created row. |
| `PATCH` | `/api/subscriptions/[id]` | Updates a subscription. Scoped to household. Returns updated row. |
| `DELETE` | `/api/subscriptions/[id]` | Deletes a subscription. Scoped to household. Returns 204. |

---

## Telegram Mini App Architecture

### Environment Detection (`lib/telegram.ts`)

`detectTelegramEnv()` checks four signals (in priority order):
1. `window.Telegram.WebApp` exists
2. `window.TelegramWebviewProxy` exists (Telegram Desktop / macOS)
3. URL search params contain `tgWebAppData`
4. URL hash contains `tgWebAppData`

`getTelegramInitData()` extracts initData from:
1. `window.Telegram.WebApp.initData` (non-empty string)
2. URL search string (if `tgWebAppData` present)
3. URL hash string (if `tgWebAppData` present)

The resolved initData is cached to `localStorage["tg_initData_v1"]`.

### initData Validation (`app/api/auth/telegram/route.ts`)

The route handles two formats of initData:
- **"raw"** — standard `query_id=...&user=...&auth_date=...&hash=...`
- **"wrapper"** — `tgWebAppData=<percent-encoded raw initData>&tgWebAppVersion=...&...`

HMAC validation follows the [Telegram Web Apps spec](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
```
secret_key   = HMAC-SHA256("WebAppData", bot_token)
expected_hash = HMAC-SHA256(data_check_string, secret_key)
```

Uses `crypto.timingSafeEqual` for the comparison.

### Auth State Machine (`app/page.tsx`)

`envState`: `"checking"` → `"telegram"` | `"web"`
`authStatus`: `"checking"` → `"authed"` | `"no_initdata"` | `"invalid_initdata"` | `"not_in_household"` | `"error"`

**Startup sequence:**
1. Retry loop polls `detectTelegramEnv()` up to 10 times × 200 ms (2 s total).
2. If Telegram detected → call `/api/auth/telegram` to validate initData.
3. On success → call `/api/me` to resolve household.
4. On household found → `GET /api/subscriptions` to load data.

If `envState` resolves to `"web"` (non-Telegram browser), the app shows: *"Open this app from Telegram: @subsion_bot"* and nothing else.

---

## State Management Pattern

`app/page.tsx` is the single stateful root. Key state groups:

```typescript
// Environment & auth
const [envState, setEnvState]       = useState<EnvState>("checking")
const [authStatus, setAuthStatus]   = useState<AuthStatus>("checking")
const [tgProfile, setTgProfile]     = useState<TgProfile | null>(null)
const [householdId, setHouseholdId] = useState<string | null>(null)
const [householdName, ...]          = useState<string | null>(null)

// Data
const [subs, setSubs]               = useState<Subscription[]>([])

// UI
const [mounted, setMounted]         = useState(false)
const [modalOpen, setModalOpen]     = useState(false)
const [editing, setEditing]         = useState<Subscription | null>(null)
const [isDark, setIsDark]           = useState(true)
const [monthLabel, setMonthLabel]   = useState("")

// localStorage migration
const [localImportReady, ...]       = useState(false)
const [importing, ...]              = useState(false)

// Debug
const [initDataLength, ...]         = useState<number | null>(null)
const [lastAuthHttpStatus, ...]     = useState<number | null>(null)
const [showDebug, setShowDebug]     = useState(false)
```

**Rules:**
- Do not add `useState` or data-fetching in leaf components — keep all state in `page.tsx`.
- CRUD handlers (`handleSave`, `handleDelete`) send API requests and update `subs` in place.
- `handleSave` returns `string | null` (error message or null on success); the form awaits this and shows errors inline.

---

## Business Logic (`lib/calculations.ts`)

- **`getBurnSummary(subs)`** — sums monthly cost per currency. Yearly subscriptions are divided by 12.
- **`getUpcoming(subs)`** — returns the next 10 subscriptions sorted by `nextChargeDate` (ISO string lexicographic sort is safe).
- **`CURRENCY_SYMBOL`** — maps `Currency` → display symbol (`EUR→€`, `USD→$`, `RUB→₽`).

---

## localStorage — Migration Layer Only

`lib/storage.ts` is no longer the primary data store. Its role is:
1. Detect pre-Supabase data during startup (in `useEffect`).
2. Offer a one-time import banner to push local subs to the API.
3. On user confirmation, clear `localStorage["subs_v2"]` and `localStorage["subs_v1"]`.

The current active localStorage key is `"subs_v2"`. On load, `subs_v1` data is auto-migrated (including renaming `owner: "max"` → `"me"` and `"molly"` → `"wife"`).

**Never use `localStorage` at module level or outside `useEffect`.**

---

## Server-Only Module (`lib/supabaseServer.ts`)

This module uses `SUPABASE_SERVICE_ROLE_KEY` and **must only be imported from API route handlers** (`app/api/**`). Importing it in any client component or `lib/telegram.ts` would leak the service role key to the browser.

The module is lazily initialised (client created on first call) so it does not throw at build time if env vars are absent.

---

## Component Conventions

- Every component file uses `"use client"` where interactivity or browser APIs are needed.
- Tailwind classes are written inline. Shared class strings are extracted to `const` at the top of the file (e.g. `INPUT` and `LABEL` in `SubscriptionForm.tsx`).
- Owner badges / buttons: `"me"` (Max) → white/gray; `"wife"` (Molly) → `#FF6B9D` (pink).
- Accent colour: `#00FF85` (bright green). Used for primary actions (FAB, submit button, selected toggle).
- CSS custom properties drive the palette (see `globals.css`):

| Variable | Dark | Light |
|---|---|---|
| `--bg-page` | `#0A0A0A` | `#F5F5F5` |
| `--bg-card` | `#111111` | `#FFFFFF` |
| `--bg-input` | `#0A0A0A` | `#FAFAFA` |
| `--border` | `#1F1F1F` | `#E5E5E5` |
| `--input-border` | `#2A2A2A` | `#D1D5DB` |
| `--text` | `#FFFFFF` | `#111111` |

Dark mode is applied via the `.dark` class on `<html>`, toggled at runtime and persisted to `localStorage["theme"]`. The layout injects an inline script to restore the theme before first paint, preventing flash.

---

## Theme Toggle

The theme button (`☀️` / `🌙`) in the page header:
1. Calls `toggleTheme()` in `page.tsx`.
2. Adds/removes `"dark"` class on `document.documentElement`.
3. Saves `"light"` or `"dark"` to `localStorage["theme"]`.

Default on first load: dark.

---

## CSV Export

`exportCSV()` in `page.tsx` builds a CSV string from the current `subs` array and triggers a browser download. Available only when `subs.length > 0`.

---

## SSR / Hydration Rules

Next.js pre-renders on the server, but `localStorage` and `window` are browser-only.

1. `useState` initialises with empty/false values.
2. `useEffect(() => { setMounted(true); ... }, [])` runs only on the client.
3. `page.tsx` returns a bare loading skeleton when `mounted === false`.
4. All `window`/`localStorage` access is inside `useEffect` or guarded by `typeof window === "undefined"`.

Never call `localStorage` or access `window` at module level or in component bodies outside `useEffect`.

---

## Development Commands

```bash
npm run dev    # Start dev server at http://localhost:3000 (hot reload)
npm run build  # Build for production (output in .next/)
npm run start  # Serve the production build
npm run lint   # Run ESLint
```

There is no test command — do not add a `test` script or test files unless explicitly asked to set up a test framework.

---

## Path Alias

TypeScript is configured with `@/*` resolving to the repository root. Always import using this alias:

```typescript
// correct
import { Subscription }  from "@/types/subscription"
import { loadSubs }      from "@/lib/storage"
import { getSupabase }   from "@/lib/supabaseServer"  // server-side only

// avoid
import { Subscription }  from "../../types/subscription"
```

---

## No Tests

There is currently no test infrastructure. If adding tests, prefer **Vitest** with `@testing-library/react`. Do not introduce Jest unless explicitly requested.

---

## Adding New Features — Checklist

1. Add or update types in `types/subscription.ts` first.
2. If the `Subscription` shape changes in a breaking way, bump the localStorage key (`subs_v2` → `subs_v3`) and add a migration in `lib/storage.ts`. Update the Supabase `subscriptions` table schema accordingly.
3. Add pure business logic functions to `lib/calculations.ts`.
4. Add or update API route handlers in `app/api/` (server logic, Supabase calls, auth checks).
5. Wire new state/handlers in `app/page.tsx`; pass only what's needed as props.
6. Create or update components in `components/`; keep them presentational where possible.
7. Run `npm run lint` before committing.

---

## Git Conventions

- Branch names follow the pattern `claude/<slug>-<session-id>`.
- Commit messages use the imperative form prefixed with a type: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- There are no git hooks or CI pipelines configured. Linting is a manual step.
