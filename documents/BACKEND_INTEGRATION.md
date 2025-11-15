# Backend Integration Guide

This document explains how to integrate the existing Bombers Bar backend with the new React frontend.

## Overview

The new Next.js frontend is designed to work seamlessly with your existing Vercel serverless backend. The backend API routes remain unchanged and will work as-is.

## Integration Steps

### Step 1: Copy Backend Files

Copy the following directories from your original `bb` project to `bb-react`:

```bash
# From /home/ubuntu/bb to /home/ubuntu/bb-react

# Copy API routes (Vercel serverless functions)
cp -r bb/api bb-react/api

# Copy server-side business logic
cp -r bb/lib bb-react/lib

# Copy database connection
cp -r bb/src bb-react/src

# Copy any server-side scripts
cp -r bb/scripts bb-react/scripts
```

### Step 2: Environment Variables

Copy your environment variables:

```bash
# Copy from the original project
cp bb/.env bb-react/.env.local
```

Ensure your `.env.local` contains:

```env
# EVE Online SSO
EVE_CLIENT_ID=your_client_id
EVE_SECRET_KEY=your_secret_key
EVE_CALLBACK_URL=http://localhost:3000/api/auth/callback

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your_jwt_secret

# Admin Character IDs
ADMIN_CHARACTER_IDS=12345678,87654321

# Mailer Service Account
MAILER_CHARACTER_ID=your_mailer_id
MAILER_REFRESH_TOKEN=your_refresh_token
```

### Step 3: Update Package Dependencies

The backend may require additional dependencies. Install them:

```bash
cd bb-react

# Core backend dependencies (if not already installed)
npm install pg jsonwebtoken cookie express dotenv

# ESI and EVE-related
npm install axios

# Any other dependencies from the original package.json
```

### Step 4: Verify API Routes

Your existing API routes should work without modification. The frontend expects these endpoints:

#### Authentication

- `POST /api/auth/login` - Initiate EVE SSO
- `GET /api/auth/callback` - EVE SSO callback
- `GET /api/auth/verify` - Verify auth status
- `POST /api/auth/logout` - Logout

#### SRP

- `GET /api/admin/srp` - List SRP requests (with pagination, filtering)
- `POST /api/srp/submit` - Submit new SRP request
- `GET /api/admin/srp/:id` - Get single SRP request
- `PUT /api/admin/srp/:id` - Update SRP request
- `POST /api/admin/srp/:id/approve` - Approve request
- `POST /api/admin/srp/:id/reject` - Reject request
- `POST /api/admin/srp/:id/paid` - Mark as paid
- `POST /api/admin/srp/bulk-approve` - Bulk approve
- `POST /api/admin/srp/bulk-paid` - Bulk mark paid
- `GET /api/admin/srp/stats` - Get SRP statistics
- `GET /api/srp/my-requests` - Get user's requests

### Step 5: Database Schema

Ensure your PostgreSQL database has the required tables. The frontend expects:

#### srp_requests table

```sql
CREATE TABLE srp_requests (
  id SERIAL PRIMARY KEY,
  character_id BIGINT NOT NULL,
  character_name VARCHAR(255) NOT NULL,
  corporation_id BIGINT NOT NULL,
  corporation_name VARCHAR(255),
  alliance_id BIGINT,
  alliance_name VARCHAR(255),
  killmail_id BIGINT UNIQUE NOT NULL,
  killmail_time TIMESTAMP NOT NULL,
  ship_type_id INTEGER NOT NULL,
  ship_name VARCHAR(255) NOT NULL,
  ship_group VARCHAR(255),
  solar_system_id INTEGER NOT NULL,
  solar_system_name VARCHAR(255) NOT NULL,
  region_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Pending',
  payout_amount NUMERIC(15,2),
  base_price NUMERIC(15,2) NOT NULL,
  adjusted_price NUMERIC(15,2) NOT NULL,
  is_polarized BOOLEAN DEFAULT FALSE,
  reject_reason TEXT,
  notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  paid_at TIMESTAMP,
  processed_by BIGINT,
  processor_name VARCHAR(255),
  payment_method VARCHAR(50),
  killmail_data JSONB,
  fleet_id INTEGER,
  fleet_name VARCHAR(255)
);
```

### Step 6: Test the Integration

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Test authentication:**
   - Visit http://localhost:3000
   - Click "Login with EVE Online"
   - Complete EVE SSO flow
   - Verify you're redirected back and authenticated

3. **Test SRP functionality:**
   - Navigate to /srp
   - Submit a test SRP request
   - Verify it appears in the table
   - Test filtering and sorting
   - Test admin actions (approve/reject/pay) if you have admin role

### Step 7: CORS Configuration

If you're running the frontend and backend on different ports during development, ensure CORS is properly configured in your API routes.

The backend middleware should already handle CORS from the original implementation in `/lib/middleware/cors.js`.

## API Response Format

The frontend expects API responses in this format:

### Success Response

```json
{
  "data": { ... },
  "success": true
}
```

### Paginated Response

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Error Response

```json
{
  "error": "Error message here",
  "success": false
}
```

## Troubleshooting

### Issue: Authentication not working

- Verify `EVE_CALLBACK_URL` matches your Next.js dev server URL
- Check that JWT_SECRET is set
- Ensure cookies are being set with `httpOnly` flag

### Issue: API calls failing

- Check that backend routes are in `/api` directory
- Verify environment variables are loaded
- Check database connection string
- Review Vercel function logs

### Issue: CORS errors

- Ensure CORS middleware is applied to all API routes
- Check that credentials are included in requests
- Verify `Access-Control-Allow-Credentials` header is set

### Issue: Database connection errors

- Verify `DATABASE_URL` format
- Check PostgreSQL is running and accessible
- Ensure database user has proper permissions
- Test connection with `psql` command

## Production Deployment

When deploying to Vercel:

1. **Configure environment variables** in Vercel dashboard
2. **Update callback URL** to production domain
3. **Test EVE SSO flow** with production URLs
4. **Verify database connection** from Vercel
5. **Check API routes** are working in production

## Next Steps

After successful integration:

1. Test all SRP functionality thoroughly
2. Migrate remaining pages (Fleet Management, FC Management, etc.)
3. Implement additional features as needed
4. Set up monitoring and error tracking
5. Configure production deployment

## Support

If you encounter issues:

1. Check browser console for errors
2. Review Vercel function logs
3. Test API endpoints directly with curl/Postman
4. Verify database queries are executing correctly
5. Check environment variables are set correctly
