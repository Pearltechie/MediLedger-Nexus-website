# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Product Vision — MediLedger Nexus

MediLedger Nexus is a **Web3-native EHR and healthcare interoperability platform** for EasyA × Consensus Miami 2025. Built in 4 phases, all complete:

### Phase 1 — Dashboard UI ✅
- Deep Obsidian (#05070A) glassmorphism design with Spectral Mint (#00FFA3) accents
- Dashboard with Overview, Patients, Records, Consult, ARIA tabs

### Phase 2 — Patient Registry + Deterministic DID ✅
- Patient registration with `did:mediledger:patient:[sha256(name|DOB|govId)]`
- Same patient at any hospital always produces the same DID (cross-hospital matching)
- Records stored encrypted on IPFS, indexed by patient DID, anchored to Hedera HCS

### Phase 3 — Hospital-to-Hospital Consent on Hedera HCS ✅
- Hospital B grants Hospital A time-limited access to patient records
- Every consent action written to consent topic **`0.0.8556166`** on Hedera testnet
- Topic ID persisted to disk (`artifacts/api-server/.consent-topic-id`) — survives server restarts
- Cross-hospital sync via Hedera mirror node polling on ConsultPage mount
- Approve / Deny / Revoke with duration picker (24h to 90 days)

### Phase 4 — ARIA Clinical Intelligence Engine ✅
- ARIA = Autonomous Record Intelligence Agent powered by Claude (Anthropic via Replit AI Integrations)
- Streaming chat UI with patient context selector
- Backend SSE streaming endpoint: `POST /api/aria/chat`
- Conservative medical safety posture with strict disclaimers
- Patient records injected as context (record titles, IPFS CIDs, HCS TX IDs)

### Key Technical Decisions
- **HCS Consent Topic**: `0.0.8556166` — persistent via disk cache + 3-layer fallback (memory → disk → env var → create new)
- **Deterministic DID**: `SHA-256(name|DOB|govId)` — no coordination needed across hospitals
- **Claude (Anthropic)**: accessed via Replit AI Integrations (no user API key required)
- **ARIA endpoint**: `POST /api/aria/chat` — SSE streaming, system prompt with clinical safety posture

---

## Artifacts

### `artifacts/mediledger-nexus` (`@workspace/mediledger-nexus`)

React + Vite frontend for **MediLedger Nexus** — Web3 medical identity platform.

- **Auth**: Web3Auth Sapphire Devnet (passkey / social login); managed in `src/lib/web3auth.ts`
- **Identity**: `src/lib/hederaIdentity.ts` — `checkExistingIdentity` detects returning users (localStorage); `createNewHederaIdentity` calls backend to create a Hedera account with hospital name as on-chain memo
- **Routing**: wouter — `/` landing, `/auth` onboarding (smart: returning users skip form), `/dashboard` protected
- **State**: Zustand + sessionStorage — tracks `isAuthenticated`, `walletAddress`, `userEmail`, `hospitalName`, `isRegistered`, `hederaIdentity`
- **Records**: AES-256-GCM browser encryption → Pinata IPFS → Hedera HCS anchor via backend
- **Consent**: `src/lib/consent.ts` + `src/lib/consentStore.ts` — HCS-based hospital consent system with mirror node sync
- **ARIA**: `src/components/dashboard/ARIAPage.tsx` — streaming Claude chat with patient context injection
- Logo: `public/logo.png` (used in nav, auth page, dashboard header)
- Requires secrets: `VITE_PINATA_JWT`, `VITE_WEB3AUTH_CLIENT_ID`
- Uses `vite-plugin-node-polyfills` for `@hashgraph/sdk` browser compat

### `artifacts/api-server` (`@workspace/api-server`)

Express backend for Hedera SDK operations (gRPC cannot run in browsers) + ARIA AI.

- `POST /api/hedera/submit-hcs` — anchors encrypted record to Hedera HCS
- `POST /api/hedera/create-account` — creates a new Hedera testnet account
- `GET /api/hedera/consent-topic` — returns/creates HCS consent topic ID (persistent via disk cache)
- `POST /api/hedera/submit-consent` — submits consent event to HCS topic
- `POST /api/aria/chat` — SSE streaming endpoint calling Claude with clinical system prompt
- Requires secrets: `VITE_HEDERA_ACCOUNT_ID`, `VITE_HEDERA_PRIVATE_KEY`, `VITE_HEDERA_TOPIC_ID`
- Requires env vars (auto-set): `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- Consent topic cached at: `artifacts/api-server/.consent-topic-id` (do not delete)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
