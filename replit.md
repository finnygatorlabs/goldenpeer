# Workspace

## Project: SeniorShield

A full-stack mobile app for seniors (65+) with:
- **Voice-guided tech help** (Ask any question, get plain-language guidance via OpenAI GPT-4o-mini or rule-based fallback)
- **Scam message detection** (Paste suspicious texts/emails; get 0-100 risk score + explanation)
- **Family alert system** (Family members get notified on high-risk scam detection)
- **Subscription billing** (Stripe checkout for Pro plan)
- **Onboarding flow** (3 steps: features intro, customization, family invite)
- **Emergency screen** (911 call, family SOS, scam emergency guide)
- **Settings & Support** (FAQ accordion, contact form, preferences)

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
- **Mobile**: Expo (React Native) with Expo Router v6
- **Design**: Clean blue (#2563EB), Inter font, iOS/Airbnb-inspired

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   ├── mockup-sandbox/     # Vite component preview server
│   └── senior-shield/      # Expo React Native mobile app
│       ├── app/
│       │   ├── _layout.tsx          # Root layout (fonts, providers, auth guard)
│       │   ├── auth/                # welcome, login, signup screens
│       │   ├── onboarding/          # step1, step2, step3 screens
│       │   ├── (tabs)/              # home, scam, family, settings + _layout
│       │   ├── subscription.tsx     # Pro plan upgrade screen
│       │   ├── emergency.tsx        # Emergency screen (911, SOS)
│       │   ├── hearing-aid.tsx      # Hearing Aid connectivity settings
│       │   ├── legal.tsx            # Legal pages (privacy, terms, cookies, security, contact)
│       │   └── support.tsx          # Help/FAQ + contact form
│       ├── context/AuthContext.tsx  # JWT auth (AsyncStorage) + AuthProvider
│       ├── hooks/useTheme.ts        # Dark/light theme hook
│       └── constants/colors.ts      # Color palette (light/dark)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/                # Utility scripts
```

## API Routes (api-server) — 92 endpoints

### Auth (10 endpoints)
- `POST /api/auth/signup` — register user (returns JWT)
- `POST /api/auth/login` — login (returns JWT)
- `POST /api/auth/google` — Google OAuth sign-in
- `POST /api/auth/forgot-password` — request password reset
- `POST /api/auth/resend-verification` — resend email verification
- `GET /api/auth/verify-email` — verify email via token
- `POST /api/auth/refresh-token` — refresh JWT (accepts token in body or header)
- `POST /api/auth/change-password` — change password (requires current)
- `GET /api/auth/verify` — verify current token validity
- `DELETE /api/auth/account` — delete account and all data

### User (4 endpoints)
- `GET/PUT /api/user/profile` — user profile CRUD
- `GET/PUT /api/user/preferences` — user preferences CRUD

### Voice (5 endpoints)
- `POST /api/voice/process-request` — voice/text AI query (GPT-4o-mini or fallback)
- `POST /api/voice/tts` — text-to-speech (OpenAI or Edge TTS fallback)
- `GET /api/voice/history` — voice request history
- `GET /api/voice/history/:id` — voice request detail
- `POST /api/voice/feedback` — rate a voice response

### Scam (7 endpoints)
- `POST /api/scam/analyze` — scam detection (risk score 0-100, 5-layer analysis)
- `GET /api/scam/history` — past scam analyses
- `GET /api/scam/history/:id` — scam analysis detail
- `POST /api/scam/feedback` — feedback on analysis accuracy
- `POST /api/scam/report` — report scam to authorities
- `GET /api/scam/library` — scam pattern library
- `POST /api/scam/library` — add scam pattern

### Family (3 endpoints)
- `GET /api/family/members` — list family members
- `POST /api/family/add-member` — invite family member by email
- `DELETE /api/family/member/:id` — remove family member

### Contacts (6 endpoints)
- `POST /api/contacts/add` — add contact
- `GET /api/contacts/list` — list contacts (filterable by category)
- `GET /api/contacts/suggestions` — top contacts by usage
- `GET /api/contacts/:id` — get contact detail
- `PUT /api/contacts/:id` — update contact
- `DELETE /api/contacts/:id` — delete contact

### Billing (7 endpoints)
- `GET /api/billing/subscription` — current subscription info
- `PUT /api/billing/subscription` — update subscription
- `DELETE /api/billing/subscription` — cancel subscription
- `GET /api/billing/trial-status` — trial days remaining
- `GET /api/billing/invoices` — invoice history (stub)
- `POST /api/billing/create-checkout` — Stripe checkout session
- `POST /api/billing/webhook` — Stripe webhook receiver

### Emergency (2 endpoints)
- `POST /api/emergency/sos` — SOS alert to all family members
- `POST /api/emergency/notify-family` — custom family notification

### Hearing Aid (7 endpoints)
- `GET /api/hearing-aid/supported-brands` — 8 supported brands
- `GET /api/hearing-aid/status` — connection status + settings
- `POST /api/hearing-aid/connect` — connect hearing aid
- `POST /api/hearing-aid/disconnect` — disconnect
- `PUT /api/hearing-aid/settings` — update audio routing, volumes, toggles
- `POST /api/hearing-aid/test-connection` — test tone + signal quality
- `POST /api/hearing-aid/battery-alert` — report low battery

### Admin (10 endpoints)
- `POST /api/admin/login` — admin JWT login
- `GET /api/admin/dashboard` — aggregate metrics
- `GET /api/admin/users` — paginated user list
- `GET /api/admin/users/:userId` — user detail
- `PUT /api/admin/users/:userId` — update user
- `DELETE /api/admin/users/:userId` — delete user
- `GET /api/admin/facilities` — list facilities
- `GET /api/admin/tickets` — paginated support tickets
- `PUT /api/admin/tickets/:ticketId` — respond to ticket
- `GET /api/admin/activity-log` — admin activity log

### Analytics (4 endpoints)
- `POST /api/analytics/events` — track analytics event
- `GET /api/analytics/user-stats` — voice/scam usage counts
- `GET /api/analytics/engagement` — engagement summary
- `GET /api/analytics/errors` — error log

### Telecom (4 endpoints)
- `POST /api/telecom/connect` — connect carrier account
- `GET /api/telecom/status` — carrier connection status
- `POST /api/telecom/disconnect` — disconnect carrier
- `POST /api/telecom/webhook` — carrier webhook

### Insurance (6 endpoints)
- `POST /api/insurance/connect` — connect insurance account
- `GET /api/insurance/status` — insurance connection status
- `POST /api/insurance/disconnect` — disconnect insurance
- `POST /api/insurance/verify-member` — verify member (stub)
- `GET /api/insurance/plans` — list plans (Medicare)
- `POST /api/insurance/webhook` — insurance webhook

### Facilities (7 endpoints)
- `POST /api/facilities/register` — register facility (admin-only CRUD)
- `GET /api/facilities/:id` — get facility (admin verified)
- `PUT /api/facilities/:id` — update facility
- `DELETE /api/facilities/:id` — delete facility
- `POST /api/facilities/:id/residents` — add resident
- `GET /api/facilities/:id/residents` — list residents
- `GET /api/facilities/:id/dashboard` — facility dashboard

### Other (8 endpoints)
- `GET /api/healthz` — health check
- `GET/PUT /api/alerts` — alerts list + mark read
- `GET /api/support/faq` — FAQ items
- `GET /api/support/tickets` — user's tickets
- `POST /api/support/create-ticket` — create ticket
- `GET/POST /api/conversations` — conversation sessions

### Middleware
- **Rate limiting**: API-wide (100/15min), auth (20/15min), scam (10/min), voice (15/min)
- **Error handler**: Standardized error responses, DB error logging, 404 handler
- **Trust proxy**: Enabled for rate-limit accuracy behind Replit proxy

## Database Tables

users, user_tiers, family_relationships, voice_assistance_history, scam_analysis, scam_detection_feedback, alerts, support_tickets, error_logs, admin_metrics, conversation_sessions, user_hearing_aids, hearing_aid_settings, hearing_aid_connection_logs, hearing_aid_battery_alerts, contacts, scam_library, subscriptions, telecom_accounts, insurance_accounts, facility_accounts, facility_residents, admin_users, admin_activity_log, analytics_events, contact_memory

## Auth

JWT tokens stored in AsyncStorage via AuthContext. `setAuthTokenGetter` wired to generated API client. App routing guard in `_layout.tsx` redirects to auth/onboarding/home based on user state.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `OPENAI_API_KEY` — GPT-4o-mini for voice assistance (optional, has fallback)
- `STRIPE_SECRET_KEY` — Stripe billing (optional, checkout disabled without it)
- `JWT_SECRET` — JWT signing secret (defaults to dev value)
- `EXPO_PUBLIC_DOMAIN` — set to REPLIT_DEV_DOMAIN for API calls from mobile

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Standalone Backend (`/backend`)

A separate, self-contained Node.js + Express backend API following the SeniorShield backend specification. This is independent from the monorepo's `artifacts/api-server` and is designed for standalone deployment.

- **Entry**: `backend/server.js`
- **Stack**: Node.js, Express, pg (raw SQL), bcryptjs, JWT, express-rate-limit
- **Database tables**: Uses `ss_` prefix to avoid conflicts with existing Drizzle-managed tables (e.g., `ss_users`, `ss_contacts`, `ss_subscriptions`)
- **Start**: `cd backend && npm run dev` (or `node server.js`)
- **Init DB**: Tables auto-create on startup via `CREATE TABLE IF NOT EXISTS`

### File Structure
```
backend/
├── server.js                    # Main entry point
├── package.json
├── .env.example
└── src/
    ├── config/database.js       # PostgreSQL pool
    ├── middleware/
    │   ├── auth.js              # JWT auth + admin auth
    │   ├── rateLimit.js         # Rate limiting (API/auth/scam)
    │   └── errorHandler.js      # Standardized error responses + DB logging
    ├── models/index.js          # 18 table definitions (auto-init)
    ├── routes/                  # 14 route modules (99 endpoints)
    │   ├── auth.js, user.js, voice.js, scam.js, family.js
    │   ├── contacts.js, billing.js, emergency.js
    │   ├── telecom.js, insurance.js, facilities.js
    │   ├── admin.js, analytics.js, help.js
    └── controllers/             # 14 controller modules
        ├── authController.js, userController.js, voiceController.js
        ├── scamController.js, familyController.js, contactsController.js
        ├── billingController.js, emergencyController.js
        ├── telecomController.js, insuranceController.js
        ├── facilitiesController.js, adminController.js
        ├── analyticsController.js, helpController.js
```

### Endpoint Summary (99 endpoints)
- Auth: 6 (signup, login, logout, refresh-token, password-reset, verify-email)
- User: 6 (profile CRUD, settings CRUD, password change, account delete)
- Voice: 6 (request, history, detail, feedback, preferences get/update)
- Scam: 6 (analyze, history, detail, report, library, library update)
- Family: 8 (add, list, get, update, delete member, alert, alerts list, message)
- Contacts: 6 (add, list, get, update, delete, suggestions)
- Billing: 8 (checkout, subscription get/update/cancel, invoices, payment method, webhook, trial-status)
- Telecom: 6 (Verizon/AT&T/T-Mobile OAuth, status, disconnect, webhook)
- Insurance: 6 (Medicare OAuth, status, disconnect, webhook, plans, verify-member)
- Facilities: 10 (register, get/update/delete, add/list residents, dashboard, alerts, webhook, analytics)
- Emergency: 2 (SOS, notify-family)
- Admin: 20 (login, dashboard, users CRUD, facilities, partners, revenue, invoices, tickets, analytics, settings, staff)
- Analytics: 4 (events, users, engagement, errors)
- Help: 4 (FAQ, tutorials, create/get ticket)

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
- Auth: `src/lib/auth.ts` — JWT middleware (`requireAuth`, `AuthRequest`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`.
