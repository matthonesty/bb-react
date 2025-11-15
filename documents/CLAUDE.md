# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bombers Bar is an EVE Online fleet management and Ship Replacement Program (SRP) application built with Next.js 14+. It handles fleet operations, SRP requests, FC management, wallet reconciliation, and automated mail processing via EVE's ESI API.

## Development Commands

### Basic Commands
```bash
npm run dev           # Start development server (localhost:3000)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without changes
```

### Database Management
The database auto-initializes on first API request. Tables are created via `lib/db.ts:initializeTables()`. No migrations needed.

## Architecture Overview

### Authentication & Authorization Flow

**EVE SSO OAuth 2.0 → JWT in httpOnly cookies**

1. User clicks login → `/api/auth/login` redirects to EVE SSO with state (CSRF + return URL)
2. EVE redirects back → `/api/auth/callback` exchanges code for token
3. Character info retrieved → Roles fetched from database (`fleet_commanders.access_level`)
4. JWT created with roles → Set as httpOnly cookie (secure in production)
5. Client-side verification via `/api/auth/verify` on mount

**Role System** (`lib/auth/roleConstants.ts`):
- `admin`: Hardcoded from `ADMIN_CHARACTER_IDS` env variable (never from DB)
- `Council`, `Accountant`, `OBomberCare`, `FC`, `Election Officer`: From `fleet_commanders.access_level`
- `user`: All authenticated users

**Authorization Pattern**:
```typescript
// Server-side (API routes)
const user = await verifyAuth(); // Reads JWT from cookies
if (!hasAuthorizedRole(user.roles)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// Client-side (pages)
<RequireAuth roles={['admin', 'Council']}>
  <AdminContent />
</RequireAuth>
```

**Special Auth Flow**: Mailer service account (`/api/auth/mailer-login`) validates only `MAILER_CHARACTER_ID` and stores refresh token for persistent ESI access.

### State Management Architecture

**Zustand** (`stores/useAuthStore.ts`):
- **Single global store** for authentication only
- Persisted to localStorage with `persist` middleware
- Contains: `user`, `isAuthenticated`, `isLoading`
- Methods: `setUser()`, `logout()`, `hasRole()`, `hasAnyRole()`
- DevTools enabled for debugging

**React Query** (`providers/QueryProvider.tsx`):
- All server state managed via TanStack Query v5
- Defaults: 1-minute stale time, no window refocus, 1 retry
- Query key pattern: `['resource', 'action', ...dependencies]`
- Example: `['srp', 'list', statusFilter, searchQuery, currentPage, sortBy, sortDirection]`

**Component State**: Use `useState` for page-specific UI state. Avoid creating new Zustand stores.

### Database Schema & Relationships

**PostgreSQL** with connection pool (20 max connections) in `lib/db.ts`.

**Key Tables**:
- `srp_requests`: SRP lifecycle (pending → approved/denied → paid)
  - Links to: `wallet_journal` (payment tracking), EVE characters
- `fleets`: Fleet scheduling with auto-status transitions (scheduled → in_progress → completed/cancelled)
  - Links to: `fleet_types`, `fleet_commanders`
  - Managed by cron: `/api/cron/update-fleet-status` (every 5 min)
- `fleet_participants`: Hunters/support in specific fleets
  - Links to: `fleets`, EVE characters
- `fleet_kills`: Individual kills with ZKillboard data
  - Links to: `fleets`, `fleet_participants`
- `fleet_commanders`: FC management with ranks (SFC/JFC/FC/Support) and alts (JSONB array)
  - Fields: `main_character_id`, `bb_corp_alt_id`, `additional_alts`, `access_level`, `status`
- `wallet_journal` & `wallet_transactions`: Corp wallet tracking for payment reconciliation
- `processed_mails`: Incoming mail tracking with error handling
- `pending_mail_sends`: Mail queue for retry on ESI failures

**Auto-initialization**: All tables use `CREATE TABLE IF NOT EXISTS`. Safe for multiple deployments.

### API Architecture

**Structure**: Next.js App Router API routes in `/app/api`

**Patterns**:
```typescript
// Standard API route pattern
export async function GET(request: NextRequest) {
  const user = await verifyAuth(); // JWT from cookies
  if (!hasAuthorizedRole(user.roles)) return 403;

  // Parse query params
  const { searchParams } = new URL(request.url);

  // Query database with dynamic filters
  const result = await db.query(/* ... */);

  return NextResponse.json({ data: result.rows });
}
```

**Key Routes**:
- Auth: `/api/auth/{login,callback,verify,logout,mailer-login}`
- Admin: `/api/admin/{srp,fleets,fleet-participants,fleet-kills,fcs,doctrines,fleet-types,srp-config,bans,wallet,system-status,esi-status}`
- Public: `/api/{fc-feedback,fc-application,bombing-intel}`
- Cron: `/api/cron/{process-mail,update-fleet-status}`
- ESI: `/api/esi/fitting-import`

**CORS**: Configured in `vercel.json` for `/api/*` routes.

**Cron Jobs** (Vercel):
- Mail processing: Every 15 minutes (`/api/cron/process-mail`)
- Fleet status updates: Every 5 minutes (`/api/cron/update-fleet-status`)

### EVE ESI Integration

**Comprehensive ESI Client** (`lib/esi.ts` - 2200+ lines):

**Features**:
- Token bucket rate limiting (new system) + legacy error budget
- Exponential backoff with jitter
- MailStopSpamming handling (15-minute max wait)
- Ship info caching (24 hours)
- Batch operations with chunking

**Key Functions**:
- `esiGet()`, `esiPost()`: Core request handlers with retry logic
- `sendMail()`: Send EVE mail with retry queue
- `getMailHeaders()`, `getMailBody()`: Mail retrieval
- `getWalletJournal()`, `getWalletTransactions()`: Wallet data
- `parseAndCategorizeFitting()`: Parse EVE fitting URLs
- `getShipInfo()`, `getMarketPrice()`: Ship data with caching

**Mail Processing Flow**:
1. Cron reads incoming mails via ESI
2. Validates against SRP rules
3. Auto-rejects ineligible requests with explanation mail
4. Queues mails in `pending_mail_sends` for retry on failures
5. Tracks in `processed_mails` to avoid duplicates

### Component Architecture

**Directory Structure**:
```
components/
├── ui/              # Reusable primitives (Button, Card, Modal, Table, Badge, Pagination)
├── auth/            # RequireAuth wrapper
├── layout/          # Header, Footer, PageContainer, PageHeader
├── srp/             # SRP-specific (SRPTable, SRPFilters, SRPDetailModal)
├── fleets/          # Fleet modals (FleetModal, AddParticipantModal, AddKillsModal)
├── fcs/             # FC management
├── doctrines/       # Doctrine/fitting management
├── bans/            # Ban management
├── mail/            # Mail processing tables
└── srp-config/      # Ship type configuration
```

**Patterns**:
- **Page Wrapper**: `<RequireAuth roles={[...]}>` for auth/role enforcement
- **Data Tables**: React Query for fetching, local state for sort/pagination, modal on row click
- **Modals**: Controlled with `isOpen` prop, `onClose` + `onSuccess` callbacks
- **Forms**: Submit → API call → invalidate React Query cache → close modal

**Example Pattern**:
```typescript
// In page component
const { data, isLoading, refetch } = useQuery({
  queryKey: ['resource', filter, page],
  queryFn: () => api.list({ filter, page }),
});

<DataTable
  data={data}
  onRowClick={(row) => setSelectedRow(row)}
/>
<Modal
  isOpen={!!selectedRow}
  onClose={() => setSelectedRow(null)}
  onSuccess={() => refetch()}
/>
```

### Type System

**Central Types** (`types/index.ts`):
- **Entities**: `User`, `Character`, `SRPRequest`, `Fleet`, `FleetCommander`, `Doctrine`, `Ban`, `ShipType`
- **API Responses**: `ApiResponse<T>`, `PaginatedResponse<T>`
- **UI Types**: `TableColumn<T>`, `PaginationState`, `SortState`

**Enforcement**: Strict TypeScript. Use specific types for API contracts. No `any` in production code.

### Routing & Navigation

**App Router** (`/app`):
```
/                              # Home page
/srp                           # SRP management (admin)
/fleets & /fleets/[id]         # Fleet listing and detail
/fcs                           # FC management (admin)
/doctrines                     # Doctrine management (admin)
/wallet                        # Wallet tracking (admin)
/bans                          # Ban management (admin)
/srp-config                    # Ship type config (admin)
/system                        # System admin (admin only)
/fc-feedback                   # Public form
/fc-application                # Public form
/bombing-intel                 # Public form
```

**Navigation** (`lib/constants/index.ts`):
- `NAV_ITEMS` array with role-based visibility
- Header filters items by user's roles
- Dynamic dropdown menus for admin sections

**Authorization**: Enforced at component level with `<RequireAuth>`, not middleware.

## Important Implementation Notes

### API Client Pattern
Use the centralized Axios client (`lib/api/client.ts`):
- Automatically includes credentials (cookies)
- No manual redirect on 401 (avoids forcing logins)
- Service layer (`lib/api/*.ts`) wraps endpoints with typed interfaces

### React Query Patterns
- **Query keys include all dependencies**: `['resource', ...allFilters]`
- **Invalidate after mutations**: `queryClient.invalidateQueries({ queryKey: ['resource'] })`
- **Use refetch callbacks**: Pass `refetch` to child components as `onSuccess`

### Database Queries
- **Dynamic SQL**: Build queries programmatically based on filters
- **Parameterized queries**: Always use `$1, $2` placeholders to prevent SQL injection
- **Pagination**: Use `LIMIT` and `OFFSET` with total count queries
- **Indexes**: Strategic indexes on frequently filtered columns (status, character_id, dates)

### ESI Rate Limiting
- **Always use ESI wrapper**: Never call ESI directly
- **Batch operations**: Use chunking functions for bulk requests
- **Handle MailStopSpamming**: Automatically retries after wait period
- **Cache ship data**: 24-hour cache to reduce ESI calls

### Security Considerations
- **Admin roles**: NEVER fetch from database, only from `ADMIN_CHARACTER_IDS` env
- **JWT validation**: Verify signature and expiration on every request
- **SQL injection**: Always use parameterized queries
- **CSRF protection**: State parameter in OAuth flow
- **httpOnly cookies**: JWT never accessible to JavaScript

### Common Gotchas
- **Role re-checking**: Roles are fetched fresh on every auth verification (no stale cache)
- **Fleet status transitions**: Managed by cron, not manual updates
- **Mail retry logic**: Failed mails queued in `pending_mail_sends`, not re-sent immediately
- **Character alts**: Stored as JSONB array in `fleet_commanders.additional_alts`
- **Fitting parsing**: Use `parseAndCategorizeFitting()` for EVE fitting format

## Environment Setup

**Required Variables** (see `.env.example`):
- `EVE_CLIENT_ID`, `EVE_SECRET_KEY`: EVE SSO credentials
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Long random string for JWT signing
- `ADMIN_CHARACTER_IDS`: Comma-separated admin character IDs (hardcoded admins)
- `MAILER_CHARACTER_ID`, `MAILER_REFRESH_TOKEN`: Mailer service account

**Optional**:
- `ENABLE_MAIL_PROCESSING`: Toggle mail processing (default: true)
- `ENABLE_WALLET_SYNC`: Toggle wallet sync (default: true)

## Testing

No test suite currently exists. When adding tests:
- Use Jest/Vitest for unit tests
- Test API routes with mock database
- Test React Query hooks with query client wrapper
- Mock ESI calls to avoid rate limits

## Code Style

- **TypeScript**: All new code
- **Functional components**: Use hooks, avoid class components
- **ESLint + Prettier**: Run `npm run lint:fix` and `npm run format` before committing
- **Server components**: Prefer server components where possible (default in App Router)
- **Error handling**: Return structured errors from API routes: `{ error: string, details?: any }`

## Development Principles

### Keep It Simple (KISS)

**Avoid Over-Engineering**:
- Don't create abstractions until you need them in 3+ places
- Resist the urge to build "flexible frameworks" for one-off features
- Simple, obvious code beats clever code
- If a feature works with a straightforward implementation, ship it

**Examples**:
```typescript
// ❌ Over-engineered
class APIServiceFactory {
  createService<T>(endpoint: string): GenericService<T> { /* complex abstraction */ }
}

// ✅ Simple and clear
export const srpApi = {
  list: (params) => apiClient.get('/api/admin/srp', { params }),
  approve: (id) => apiClient.post(`/api/admin/srp/${id}/approve`),
};
```

**When to Add Complexity**:
- Only when it solves a real, current problem
- When the same logic appears 3+ times (follow Rule of Three)
- When simplicity would create security vulnerabilities
- When external systems require it (EVE ESI rate limiting, for example)

### Don't Repeat Yourself (DRY)

**Extract Reusable Code**:
- **UI Components**: If a component pattern appears 3+ times, extract to `components/ui/`
- **API Logic**: Shared request patterns go in service layer (`lib/api/`)
- **Business Logic**: Complex operations go in `lib/` utilities
- **Types**: Shared types in `types/index.ts`, component-specific types stay local
- **Constants**: Magic numbers and strings go in `lib/constants/`

**Database Patterns**:
```typescript
// ❌ Repeated auth + query pattern
export async function GET() {
  const user = await verifyAuth();
  if (!hasAuthorizedRole(user.roles)) return 403;
  const result = await db.query('SELECT * FROM table');
  return NextResponse.json({ data: result.rows });
}

// ✅ Extract if used 3+ times
async function authorizedQuery(requiredRoles: string[], query: string) {
  const user = await verifyAuth();
  if (!user.roles.some(r => requiredRoles.includes(r))) throw new Error('Forbidden');
  return db.query(query);
}
```

**React Query Patterns**:
```typescript
// ❌ Duplicate fetching logic
const srpQuery = useQuery({ queryKey: ['srp'], queryFn: () => apiClient.get('/api/admin/srp') });
const fleetsQuery = useQuery({ queryKey: ['fleets'], queryFn: () => apiClient.get('/api/admin/fleets') });

// ✅ Use service layer (already done in this codebase)
const srpQuery = useQuery({ queryKey: ['srp'], queryFn: () => srpApi.list() });
const fleetsQuery = useQuery({ queryKey: ['fleets'], queryFn: () => fleetsApi.list() });
```

**When NOT to DRY**:
- Code that looks similar but serves different purposes
- Extracting would make code harder to understand
- Only 2 occurrences (wait for the third)
- Different code that happens to share implementation today but may diverge

### Balance DRY and KISS

**Good Abstraction** (used in this codebase):
- `RequireAuth` wrapper: Reused on every protected page, clear purpose
- `srpApi` service layer: Centralizes API calls with type safety
- `formatISK()`, `formatDate()`: Pure functions, obvious utility
- ESI wrapper (`lib/esi.ts`): Complex because EVE's API demands it

**Avoid**:
- Premature abstraction: "We might need this flexibility later"
- Over-generic helpers: `handleData(data, type, mode, options)`
- Deep inheritance chains
- Factory patterns for simple object creation
- Middleware/decorator patterns unless absolutely necessary

### Practical Guidelines

**Adding a New Feature**:
1. Write the straightforward implementation first
2. Make it work with simple, obvious code
3. Only after it works, look for duplication to extract
4. If extraction makes code harder to read, don't do it

**Refactoring Existing Code**:
1. If you see the same logic 3+ times, extract it
2. Give it a clear, specific name (not `handleStuff` or `processData`)
3. Add TypeScript types
4. Update all call sites at once

**Component Design**:
```typescript
// ❌ Over-abstracted
<GenericTable config={complexConfigObject} transformer={dataTransformer} />

// ✅ Simple and clear
<SRPTable data={srpRequests} onRowClick={handleRowClick} />
```

**API Route Design**:
```typescript
// ❌ Generic catch-all
export async function POST(request: NextRequest) {
  const { action, resource, data } = await request.json();
  return handleGenericAction(action, resource, data); // Too clever
}

// ✅ Explicit endpoints
export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  const body = await request.json();
  // Clear, single-purpose logic
}
```

### Code Review Checklist

Before considering code complete, ask:
- [ ] Can this be understood in 30 seconds?
- [ ] Is there duplicated code that should be extracted?
- [ ] Did I add abstraction only when needed in 3+ places?
- [ ] Would a new developer understand this without asking?
- [ ] Is the complexity justified by the problem being solved?

**Remember**: The goal is maintainable code. Simple code is easier to maintain than DRY code. DRY code is easier to maintain than duplicated code. Find the right balance.

## Deployment

**Vercel** (configured in `vercel.json`):
- Auto-deploy on git push
- Configure environment variables in Vercel dashboard
- Cron jobs auto-configured from `vercel.json`
- Region: `iad1` (US East)

**Build Process**:
1. `npm install`
2. `npm run build`
3. Next.js optimizes and generates static/dynamic routes
4. Deployed to Vercel edge network
