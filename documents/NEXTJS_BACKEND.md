# Next.js Backend - Fully Integrated

## ✅ Complete Next.js App

Your Bombers Bar application is now a **complete Next.js app** with integrated backend API routes.

---

## Architecture

### API Routes (Next.js App Router)

All API logic is in `app/api/` directory:

```
app/api/
├── auth/
│   ├── login/route.ts       # EVE SSO login initiation
│   ├── callback/route.ts    # EVE SSO callback handler
│   ├── verify/route.ts      # JWT verification
│   └── logout/route.ts      # Logout handler
└── admin/
    └── srp/
        └── route.ts         # SRP list with filters, pagination
```

### Backend Logic

Reused from original bb project:

- `/lib` - Business logic (auth, ESI, SRP, etc.)
- `/src` - Database connection
- All CommonJS modules work with Next.js

---

## Running the Application

### Development

```bash
npm run dev
```

That's it! Everything works with the standard Next.js dev server:

- ✅ Frontend at http://localhost:3000
- ✅ API routes at http://localhost:3000/api/\*
- ✅ Database connection
- ✅ EVE SSO authentication
- ✅ Full SRP functionality

### Production Build

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI (optional)
npm install -g vercel

# Deploy
vercel --prod
```

Or push to GitHub and connect to Vercel dashboard for automatic deployments.

---

## Features Implemented

### Authentication (Complete)

**Login Flow:**

1. User clicks "Login with EVE Online"
2. Redirects to `/api/auth/login`
3. Redirects to EVE SSO
4. User authenticates with EVE
5. EVE SSO redirects to `/api/auth/callback`
6. Backend exchanges code for tokens
7. Creates JWT and sets cookie
8. Redirects user to `/srp`

**Verification:**

- `/api/auth/verify` - Checks JWT cookie
- Returns user character info and roles
- Admin roles based on character ID

**Logout:**

- `/api/auth/logout` - Clears JWT cookie

### SRP API (Complete)

**List Endpoint:** `GET /api/admin/srp`

Query parameters:

- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 50)
- `status` - Filter by status (Pending, Approved, Rejected, Paid, Ineligible, or 'all')
- `search` - Search character name, ship name, or system
- `sortBy` - Column to sort (submitted_at, character_name, ship_name, etc.)
- `sortDirection` - asc or desc

Returns:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

## Database

### Connection

Uses PostgreSQL connection from your `.env`:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

Connection pool configured in `/lib/db.ts`:

- Max 20 connections
- 30s idle timeout
- 2s connection timeout
- SSL enabled in production

### Required Table

Your database already has the `srp_requests` table. The API queries it directly.

---

## Environment Variables

Your `.env` or `.env.local` needs:

```env
# EVE Online SSO
EVE_CLIENT_ID=your_client_id
EVE_SECRET_KEY=your_secret_key
EVE_CALLBACK_URL=http://localhost:3000/api/auth/callback

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Secret
JWT_SECRET=your_long_random_secret

# Admin Character IDs (comma-separated)
ADMIN_CHARACTER_IDS=12345678,87654321
```

**Production:** Update `EVE_CALLBACK_URL` to your domain.

---

## Security

### JWT Authentication

- **HttpOnly cookies** - JavaScript can't access tokens
- **7-day expiry** - Users stay logged in for a week
- **Secure flag** - Enabled in production (HTTPS only)
- **SameSite: lax** - CSRF protection

### CSRF Protection

- State parameter in OAuth flow
- Verified on callback
- Stored in short-lived cookie (10 minutes)

### SQL Injection Protection

- Parameterized queries
- No string concatenation
- PostgreSQL escaping

---

## API Response Format

### Success Response

```json
{
  "data": {...},
  "success": true
}
```

### Error Response

```json
{
  "error": "Error message",
  "success": false
}
```

### Paginated Response

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

## Testing

### 1. Test Authentication

```bash
# Start server
npm run dev

# Visit http://localhost:3000
# Click "Login with EVE Online"
# Should redirect to EVE SSO
# After login, should redirect back to /srp
```

### 2. Test SRP List

```bash
# Visit http://localhost:3000/srp
# Should see table with SRP requests from database
# Test filtering, sorting, pagination
```

### 3. Test API Directly

```bash
# Check auth
curl http://localhost:3000/api/auth/verify

# List SRP (requires auth cookie)
curl -H "Cookie: auth_token=YOUR_TOKEN" \
  "http://localhost:3000/api/admin/srp?page=1&pageSize=10"
```

---

## Next API Routes to Implement

Based on your needs, you can add:

### SRP Operations

- `POST /api/srp/submit` - Submit new SRP request
- `POST /api/admin/srp/[id]/approve` - Approve request
- `POST /api/admin/srp/[id]/reject` - Reject request
- `POST /api/admin/srp/[id]/paid` - Mark as paid

### Fleet Management

- `GET /api/admin/fleets` - List fleets
- `POST /api/admin/fleets` - Create fleet
- `GET /api/admin/fleets/[id]` - Get fleet details

### Admin

- `GET /api/admin/wallet` - Wallet transactions
- `GET /api/admin/fcs` - FC list
- `POST /api/admin/fcs` - Add FC

Just create new `route.ts` files in `app/api/` following the same pattern!

---

## Benefits of Next.js API Routes

✅ **No separate backend** - Frontend and backend in one codebase
✅ **TypeScript throughout** - Type safety end-to-end
✅ **Easy deployment** - Deploy to Vercel with one command
✅ **Auto-scaling** - Vercel handles scaling automatically
✅ **Edge-ready** - Can deploy API routes to edge locations
✅ **Hot reload** - Changes to API routes reload instantly
✅ **Built-in features** - Cookies, headers, redirects all built-in

---

## Troubleshooting

### Issue: "Module not found"

Install missing dependencies:

```bash
npm install cookie express jsonwebtoken pg dotenv
npm install --save-dev @types/jsonwebtoken @types/pg @types/cookie
```

### Issue: "Database connection failed"

Check your `DATABASE_URL` in `.env`:

- Correct username/password
- Database is accessible
- Firewall allows connection
- SSL settings match (production vs development)

### Issue: "EVE SSO error"

Check your EVE SSO credentials:

- `EVE_CLIENT_ID` is correct
- `EVE_SECRET_KEY` is correct
- `EVE_CALLBACK_URL` matches your registered callback

### Issue: "JWT verification failed"

- Ensure `JWT_SECRET` is set
- Check cookie is being set (browser dev tools)
- Clear cookies and try fresh login

---

## Status

✅ **Authentication** - Complete and working
✅ **SRP List API** - Complete with filters, search, pagination
✅ **Database** - Connected and queried
✅ **Build** - Successful
✅ **TypeScript** - No errors

**Ready for:**

- Local development
- Testing
- Adding more API routes
- Production deployment

---

## Quick Reference

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Deploy to Vercel
vercel --prod
```

**Your app is production-ready! 🚀**
