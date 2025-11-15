# Admin Login Guide

## Overview

The authentication system now supports **two-tier login** with different OAuth scope sets:

1. **Regular Login** - Minimal scopes for general users
2. **Admin Login** - Extended scopes for administrative operations

## Configuration

### 1. Set Your Admin Character ID

First, find your character ID by logging in and checking:

```javascript
// In browser console after logging in:
fetch('/auth/verify')
  .then((r) => r.json())
  .then((d) => console.log('Character ID:', d.character.id));
```

Then add it to `.env`:

```env
ADMIN_CHARACTER_IDS=93922003,12345,67890
```

Multiple admin IDs can be comma-separated.

### 2. Restart Server

After updating `.env`, restart your development server to load the new configuration:

```bash
# Kill the current server (Ctrl+C)
npm run dev
```

## Login Endpoints

### Regular Login (`/auth/login`)

**URL**: `https://data.edencom.net/auth/login`

**Scopes Requested**:

- publicData
- esi-location.read_location.v1
- esi-location.read_ship_type.v1
- esi-skills.read_skills.v1
- esi-assets.read_assets.v1
- esi-wallet.read_character_wallet.v1

**Use For**:

- General user login
- Basic application features
- Faster authorization (fewer permissions)

### Admin Login (`/auth/admin-login`)

**URL**: `https://data.edencom.net/auth/admin-login`

**Scopes Requested**: All 60+ scopes enabled in your EVE SSO application, including:

- All character scopes (calendar, mail, skills, wallet, assets, etc.)
- All corporation scopes (membership, wallets, assets, structures, etc.)
- Alliance scopes (contacts)
- Fleet scopes (read/write)
- Universe scopes (structures)

**Use For**:

- Admin operations requiring extended ESI access
- Corporation management features
- Advanced API operations

## How It Works

### Flow Diagram

```
User clicks login → Choose endpoint → EVE SSO → Authorize scopes → Callback
                    /                                              /
                   /                                              /
          Regular Login                                   System checks
     (minimal scopes)                                  character ID against
                  \                                     ADMIN_CHARACTER_IDS
                   \                                            |
            Admin Login                                         |
         (all scopes)                              Assigns roles: ['user'] or
                                                                 ['user', 'admin']
```

### Role Assignment

**After authentication (callback handler)**:

1. System receives character info from EVE SSO
2. Checks if `character.id` is in `ADMIN_CHARACTER_IDS`
3. Assigns roles:
   - Regular user: `['user']`
   - Admin user: `['user', 'admin']`

**Important**: Admin role is determined by character ID, NOT by which login endpoint was used. However, the scopes in the access token depend on which endpoint was used.

### Token Scopes vs. Roles

| Login Type                  | Scopes in Token | Admin Role | Admin Middleware        |
| --------------------------- | --------------- | ---------- | ----------------------- |
| Regular login, regular user | Minimal         | ❌ No      | ❌ Fails (403)          |
| Regular login, admin user   | Minimal         | ✅ Yes     | ✅ Passes role check    |
| Admin login, regular user   | Extended        | ❌ No      | ❌ Fails (403)          |
| Admin login, admin user     | Extended        | ✅ Yes     | ✅ Passes (full access) |

**Key Point**: If you're an admin but login via regular login, you'll pass admin role checks but won't have extended scopes in your token. For full admin functionality, use the admin login endpoint.

## Usage Examples

### Frontend - Regular Login Button

```jsx
<button onClick={() => (window.location.href = '/auth/login')}>
  <img
    src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-large.png"
    alt="Login with EVE Online"
  />
</button>
```

### Frontend - Admin Login Button

```jsx
<button onClick={() => (window.location.href = '/auth/admin-login')}>
  <img
    src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-large.png"
    alt="Admin Login with EVE Online"
  />
</button>
```

### API Endpoint - Check Admin Role

```javascript
const { requireAuth, ROLES } = require('../../lib/auth/middleware');

module.exports = async (req, res) => {
  const auth = await requireAuth(req, res);

  if (!auth.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user has admin role
  if (auth.roles.includes(ROLES.ADMIN)) {
    // Admin-specific logic
    return res.json({ message: 'Admin access', admin: true });
  }

  // Regular user logic
  res.json({ message: 'User access', admin: false });
};
```

### API Endpoint - Require Admin

```javascript
const { requireAdmin } = require('../../lib/auth/middleware');

module.exports = async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return; // 401 or 403 already sent

  // This code only runs for authenticated admin users
  res.json({
    message: 'Admin access granted',
    admin: auth.character.name,
  });
};
```

### API Endpoint - Require Admin + Check Scopes

```javascript
const { requireAdmin } = require('../../lib/auth/middleware');
const { hasRequiredScopes, CORPORATION_SCOPES } = require('../../lib/auth/scopes');
const evesso = require('../../lib/auth/sso');

module.exports = async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // Validate access token has required scopes
  const payload = await evesso.validateAccessToken(auth.accessToken);

  if (!hasRequiredScopes(payload.scp, [CORPORATION_SCOPES.WALLETS])) {
    return res.status(403).json({
      error: 'Insufficient scopes',
      message: 'Please login via /auth/admin-login to access this feature',
    });
  }

  // Admin with correct scopes - proceed
  res.json({ message: 'Full admin access' });
};
```

## Testing

### 1. Test Regular Login

```bash
# Navigate to:
https://data.edencom.net/auth/login

# Should request minimal scopes
# Check in browser after login:
fetch('/auth/verify').then(r => r.json()).then(console.log)
// Should show: { authenticated: true, character: {...}, roles: ['user'] } or ['user', 'admin']
```

### 2. Test Admin Login

```bash
# Navigate to:
https://data.edencom.net/auth/admin-login

# Should request all scopes (60+ permissions)
# Check token scopes after login
```

### 3. Test Admin Endpoint

```bash
# Visit:
https://data.edencom.net/api/admin/status

# If you're an admin:
# Returns: { status: 'success', admin: {...} }

# If you're not an admin:
# Returns: 403 Forbidden
```

## Customizing Scopes

### Edit Regular User Scopes

File: `lib/auth/adminScopes.js`

```javascript
const REGULAR_USER_SCOPES = [
  'publicData',
  CHARACTER_SCOPES.LOCATION,
  CHARACTER_SCOPES.SHIP_TYPE,
  CHARACTER_SCOPES.SKILLS,
  CHARACTER_SCOPES.ASSETS,
  CHARACTER_SCOPES.WALLET,
  // Add more scopes as needed
];
```

### Edit Admin Scopes

File: `lib/auth/adminScopes.js`

The `ADMIN_SCOPES` array already includes all scopes enabled in your EVE SSO application. Add or remove scopes as needed.

## Security Considerations

1. **Admin Character IDs**: Keep your `.env` file secure. Never commit it to git.

2. **Scope Principle**: Only request scopes you actually need. Don't request admin scopes for regular users.

3. **Role Checks**: Always verify roles server-side. Don't trust client-side role checks.

4. **Scope Checks**: For sensitive operations, verify the access token has required scopes, not just the role.

5. **Token Storage**: Tokens are stored in httpOnly cookies (not accessible to JavaScript), providing XSS protection.

## Troubleshooting

### "403 Forbidden" on Admin Endpoint

**Cause**: Your character ID is not in `ADMIN_CHARACTER_IDS`

**Solution**:

1. Get your character ID from `/auth/verify`
2. Add it to `.env`: `ADMIN_CHARACTER_IDS=YOUR_ID`
3. Restart server

### "Insufficient scopes" Error

**Cause**: Logged in via regular login, but endpoint requires admin scopes

**Solution**: Logout and login via `/auth/admin-login`

### Scopes Not Updating

**Cause**: Old session has old scopes

**Solution**:

1. Logout: `/auth/logout`
2. Login again with correct endpoint
3. New token will have correct scopes

## Production Deployment

When deploying to production:

1. **Update `.env` on Vercel**:

   ```bash
   vercel env add ADMIN_CHARACTER_IDS
   # Enter: 93922003,12345,67890
   ```

2. **Update callback URL** in EVE Developers Portal:

   ```
   https://data.edencom.net/auth/callback
   ```

3. **Update `.env` locally** to match production:

   ```env
   EVE_CALLBACK_URL=https://data.edencom.net/auth/callback
   ```

4. **Deploy**:
   ```bash
   git add .
   git commit -m "Add admin login system"
   git push
   ```

## Summary

✅ **Regular login** - Fast, minimal permissions, suitable for general users
✅ **Admin login** - Extended permissions, required for advanced features
✅ **Role-based access** - Server-side role checks via character ID
✅ **Scope validation** - Verify token has required ESI scopes
✅ **Secure by default** - httpOnly cookies, CSRF protection, separate admin flow

For more details, see `lib/auth/README.md`.
