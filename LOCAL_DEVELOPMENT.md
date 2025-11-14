# Local Development Guide

## The API Route Issue

You're getting a 404 on `/api/auth/login` because:

1. **The backend uses Vercel serverless functions** (`/api` directory)
2. **Next.js App Router expects routes in** `app/api/` directory
3. These are two different systems

## Solutions

### Option 1: Use Vercel CLI (Recommended for Local Dev)

The Vercel CLI properly supports the `/api` serverless functions locally:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Run with Vercel CLI (supports /api directory)
cd /home/ubuntu/bb-react
vercel dev
```

This will:
- ✅ Serve `/api` routes correctly
- ✅ Load environment variables from `.env`
- ✅ Simulate the Vercel production environment
- ✅ Support all backend functionality

### Option 2: Deploy to Vercel (Works Immediately)

The app will work immediately on Vercel:

```bash
# Link to Vercel project
vercel

# Deploy
vercel --prod
```

On Vercel, the `/api` directory works automatically.

### Option 3: Port API Routes to Next.js (More Work)

Convert the serverless functions to Next.js route handlers. This requires:

1. Move logic from `/api` to `app/api` with `route.ts` files
2. Convert CommonJS to ES modules
3. Adapt to Next.js request/response format

Example structure:
```
app/api/auth/login/route.ts
app/api/auth/callback/route.ts
app/api/auth/verify/route.ts
etc...
```

---

## Quick Fix: Use Vercel Dev

**Install and run:**

```bash
npm install -g vercel
cd /home/ubuntu/bb-react
vercel dev
```

**Then access:**
- Frontend: http://localhost:3000
- API routes: http://localhost:3000/api/auth/login ✅

---

## Environment Variables

Ensure your `.env.local` or `.env` has:

```env
# EVE Online SSO
EVE_CLIENT_ID=your_client_id
EVE_SECRET_KEY=your_secret_key
EVE_CALLBACK_URL=http://localhost:3000/api/auth/callback

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your_long_random_secret_string

# Admin Character IDs (comma-separated)
ADMIN_CHARACTER_IDS=12345678,87654321
```

---

## Why This Happens

**Next.js Development Server (`npm run dev`):**
- Supports `app/api/*/route.ts` files
- Does NOT support `/api` directory (Vercel serverless functions)

**Vercel Development Server (`vercel dev`):**
- Supports `/api` directory (Vercel serverless functions) ✅
- Supports `app/api/*/route.ts` files ✅
- Matches production behavior

**Production on Vercel:**
- Both work perfectly ✅

---

## Current Project Status

✅ Frontend: Fully built and working
✅ Backend: Copied to `/api` directory
❌ Local API access: Needs `vercel dev` OR port to Next.js

---

## Recommendation

For now, use **`vercel dev`** for local development. It's the fastest way to get everything working without code changes.

Later, if you want Next.js-only development, port the API routes to `app/api` format.
