# CLAUDE.md — SubTracker (bug-free-subs)

This file provides guidance for AI assistants (Claude Code and others) working in this repository.

---

## Project Overview

**SubTracker** is a dark-themed, mobile-optimised subscription management web app built for a couple. It tracks recurring charges, shows monthly burn rates per currency, and lists upcoming payments. All data lives in the browser's `localStorage` — there is no backend, database, or authentication layer.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 (utility classes only, no component library) |
| Fonts | Geist Sans + Geist Mono (via `geist` npm package) |
| Persistence | Browser `localStorage` (key: `subs_v1`) |
| Linting | ESLint 9 with `eslint-config-next` |
| Build | `next build` / `next dev` |

No test framework is configured.

---

## Directory Structure

```
bug-free-subs/
├── app/
│   ├── layout.tsx          # Root layout: fonts, metadata, viewport, dark class
│   ├── page.tsx            # Main page: state management, CRUD orchestration
│   └── globals.css         # Tailwind import + global CSS variables + dark overrides
├── components/
│   ├── BurnSummary.tsx     # Monthly spend totals grouped by currency
│   ├── UpcomingList.tsx    # Next 10 upcoming charges (chronological)
│   ├── SubscriptionList.tsx # Full list with edit/delete actions
│   └── SubscriptionForm.tsx # Add/edit modal (bottom-sheet on mobile)
├── lib/
│   ├── storage.ts          # loadSubs() / saveSubs() — localStorage adapter
│   └── calculations.ts     # getBurnSummary(), getUpcoming(), CURRENCY_SYMBOL
├── types/
│   └── subscription.ts     # Core types: Subscription, Currency, BillingCycle, Owner
├── public/                 # Static assets (SVGs, favicon)
├── next.config.ts          # Minimal Next.js config
├── tsconfig.json           # TypeScript config (strict, path alias @/*)
├── eslint.config.mjs       # ESLint config (next/core-web-vitals, typescript)
└── postcss.config.mjs      # PostCSS config (@tailwindcss/postcss)
```

---

## Core Data Model

Defined in `types/subscription.ts`:

```typescript
type Currency     = "EUR" | "USD" | "RUB"
type BillingCycle = "monthly" | "yearly"
type Owner        = "me" | "wife"

type Subscription = {
  id:             string   // crypto.randomUUID()
  name:           string
  amount:         number   // stored as a float
  currency:       Currency
  billingCycle:   BillingCycle
  nextChargeDate: string   // ISO date: YYYY-MM-DD
  category:       string   // free-text, e.g. "Entertainment"
  card:           string   // free-text, e.g. "Visa *4242"
  owner:          Owner
}
```

The localStorage key is `"subs_v1"`. The `v1` suffix exists to allow future schema migrations without breaking old data.

---

## Business Logic (`lib/calculations.ts`)

- **`getBurnSummary(subs)`** — sums monthly cost per currency. Yearly subscriptions are divided by 12 to normalise to monthly.
- **`getUpcoming(subs)`** — returns the next 10 subscriptions sorted by `nextChargeDate` (lexicographic sort is safe because dates are ISO strings).
- **`CURRENCY_SYMBOL`** — maps `Currency` → display symbol (`EUR→€`, `USD→$`, `RUB→₽`).

---

## State Management Pattern

`app/page.tsx` is the single stateful root. It:

1. Defers localStorage reads to `useEffect` (avoids SSR hydration mismatch).
2. Shows a skeleton UI while `mounted === false`.
3. Passes `persist(updated)` — a `useCallback` that sets state *and* saves — to child handlers.
4. Owns the modal open/close and the `editing` subscription reference.
5. Passes only read props and callbacks down to components (no shared context or global store).

Do not add `useState` or data-fetching in leaf components — keep all state in `page.tsx`.

---

## Component Conventions

- Every component file uses `"use client"` where interactivity or browser APIs are needed.
- Tailwind classes are written inline. Shared class strings are extracted to `const` at the top of the file (see `INPUT` and `LABEL` in `SubscriptionForm.tsx`).
- Owner badges: `"me"` → white/gray; `"wife"` → `#FF6B9D` (pink). Keep these colours consistent.
- Accent colour: `#00FF85` (bright green). Used for primary actions (FAB, submit button, selected toggle).
- Background palette: `#0A0A0A` (page bg), `#111111` (card/modal bg), `#1F1F1F` (borders), `#2A2A2A` (input borders).

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
import { Subscription } from "@/types/subscription"
import { loadSubs }     from "@/lib/storage"

// avoid
import { Subscription } from "../../types/subscription"
```

---

## SSR / Hydration Rules

Next.js pre-renders on the server, but `localStorage` is browser-only. The pattern in use:

1. `useState` initialises with an empty array / false.
2. `useEffect(() => { setSubs(loadSubs()); setMounted(true) }, [])` runs only on the client.
3. Components guard on `mounted` before rendering real content; show skeleton divs otherwise.

Never call `localStorage` at the module level or inside a component body outside of `useEffect`.

---

## No Tests

There is currently no test infrastructure. If adding tests, prefer **Vitest** with `@testing-library/react` as it integrates well with the Vite-based build path. Do not introduce Jest unless explicitly requested.

---

## No Backend / API Routes

This is a purely client-side app. Do not create files under `app/api/` unless a backend is explicitly requested. Do not add server actions (`"use server"`) — there is no database to interact with.

---

## Adding New Features — Checklist

1. Add or update types in `types/subscription.ts` first.
2. Update storage schema version (`subs_v1` → `subs_v2`) if the `Subscription` shape changes in a breaking way; add a migration in `lib/storage.ts`.
3. Add pure business logic functions to `lib/calculations.ts`.
4. Wire new state/handlers in `app/page.tsx`; pass only what's needed as props.
5. Create or update components in `components/`; keep them presentational where possible.
6. Run `npm run lint` before committing.

---

## Git Conventions

- Branch names follow the pattern `claude/<slug>-<session-id>`.
- Commit messages use the imperative form and are prefixed with a type: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- There are no git hooks or CI pipelines configured. Linting is a manual step.
