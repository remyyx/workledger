# Admin API — Drop-in Files

All files in this folder are ready to copy into the StudioLedger codebase. They implement the admin authentication system, API routes, seed script, and dashboard UI.

## Prerequisites

Migration 015 (`supabase/migrations/015_admin_accounts.sql`) must be applied — it creates the 6 admin tables: `admin_accounts`, `admin_sessions`, `admin_audit_log`, `admin_permissions`, `dispute_arbitrators`, `dispute_panels`.

Install bcryptjs if not already present:

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

## File Map — Where to Drop Each File

```
Admin-API/                        →  Your project root
├── lib/
│   ├── admin-auth.ts             →  src/lib/admin/auth.ts
│   └── admin-middleware.ts       →  src/lib/admin/middleware.ts
├── api/admin/
│   ├── login/route.ts            →  src/app/api/admin/login/route.ts
│   ├── logout/route.ts           →  src/app/api/admin/logout/route.ts
│   ├── me/route.ts               →  src/app/api/admin/me/route.ts
│   ├── disputes/route.ts         →  src/app/api/admin/disputes/route.ts
│   └── stats/route.ts            →  src/app/api/admin/stats/route.ts
├── app/admin/
│   ├── login/page.tsx            →  src/app/admin/login/page.tsx
│   └── page.tsx                  →  src/app/admin/page.tsx
└── scripts/
    └── seed-boss.ts              →  scripts/seed-boss.ts
```

## Setup Steps

### 1. Copy files into the project

Move each file to its target path (listed above). The import paths in the files use `@/lib/admin/...` which matches the standard Next.js `@` alias pointing to `src/`.

### 2. Push migration 015 (if not done)

```bash
supabase db push
```

### 3. Seed the boss account

```bash
npx tsx scripts/seed-boss.ts
```

This prompts for a password and creates `remy@studioledger.ai` with the `boss` role. Safe to re-run — skips if account exists.

For CI/scripted setups, set `ADMIN_SEED_PASSWORD` env var to skip the prompt.

### 4. Test the login flow

```bash
# Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"remy@studioledger.ai","password":"your-password"}'

# Response: { "token": "abc123...", "admin": { ... } }

# Use token for authenticated requests
curl http://localhost:3000/api/admin/me \
  -H "Authorization: Bearer abc123..."

# Check stats
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer abc123..."

# List disputes
curl http://localhost:3000/api/admin/disputes \
  -H "Authorization: Bearer abc123..."
```

### 5. Open the dashboard

Navigate to `http://localhost:3000/admin/login` and sign in.

## Architecture

- **Separate from user auth**: Admin uses its own `admin_accounts` + `admin_sessions` tables, not Supabase Auth. This gives full control over session duration, audit logging, and role management.
- **bcrypt passwords**: 12-round bcrypt hashing via `bcryptjs`.
- **SHA-256 session tokens**: Raw token sent to client, SHA-256 hash stored in DB. Even if DB is compromised, tokens can't be reversed.
- **8-hour sessions**: Configurable in `admin-auth.ts` (`SESSION_DURATION_HOURS`).
- **httpOnly cookies**: Login sets a cookie scoped to `/admin` paths for the dashboard. API clients can also use `Authorization: Bearer` or `X-Admin-Token` headers.
- **Permission matrix**: 17 resources × 5 roles, checked by `withAdmin()` middleware. Boss bypasses all checks.
- **Immutable audit log**: Every login, logout, permission denial, and dispute action is logged to `admin_audit_log` for AUSTRAC compliance.

## API Routes Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/login` | None | Login, returns token + sets cookie |
| POST | `/api/admin/logout` | Token | Destroys session, clears cookie |
| GET | `/api/admin/me` | Token | Current admin profile + permissions |
| PATCH | `/api/admin/me` | Token | Update own display name |
| GET | `/api/admin/stats` | Token + platform_stats:read | Platform-wide statistics |
| GET | `/api/admin/disputes` | Token + disputes:read | List disputes with filters |
| POST | `/api/admin/disputes` | Token + disputes:write | Escalate, assign, or resolve disputes |

## Role Permissions

| Role | Access |
|------|--------|
| **boss** | Everything — bypasses permission checks entirely |
| **dev** | Database, architecture, platform stats |
| **accounting** | Financial data, fee ledger, platform stats |
| **commercial** | Contracts, disputes, users |
| **protocol** | UX/UI, user experience, platform stats |

Full permission matrix is seeded by migration 015 in `admin_permissions`.
