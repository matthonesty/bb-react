# EVE Online SSO Authentication System

Complete OAuth 2.0 implementation for EVE Online Single Sign-On (SSO) authentication with JWT signature verification, automatic token refresh, and comprehensive scope management.

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │ ───> │  EVE SSO     │ ───> │  Application│
│             │ <─── │  (OAuth 2.0) │ <─── │   Backend   │
└─────────────┘      └──────────────┘      └─────────────┘
      │                                            │
      └────────────── Cookie Auth ────────────────┘
                       (with RBAC)
```

## Components

### Core Files

| File                   | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `sso.js`               | Main EVE SSO service (OAuth 2.0 flow)              |
| `middleware.js`        | Authentication middleware for serverless functions |
| `jwks.js`              | JWT signature verification using JWKS              |
| `scopes.js`            | Scope management and validation                    |
| `roles.js`             | Role-Based Access Control (RBAC) system            |
| `EVE_LOGIN_BUTTONS.md` | Official EVE login button guidelines               |

### API Endpoints

| Endpoint            | File                      | Purpose                                     |
| ------------------- | ------------------------- | ------------------------------------------- |
| `/auth/login`       | `api/auth/login.js`       | Initiate OAuth flow (regular user scopes)   |
| `/auth/admin-login` | `api/auth/admin-login.js` | Initiate OAuth flow (admin/extended scopes) |
| `/auth/callback`    | `api/auth/callback.js`    | OAuth callback handler                      |
| `/auth/verify`      | `api/auth/verify.js`      | Check auth status                           |
| `/auth/logout`      | `api/auth/logout.js`      | Logout and revoke tokens                    |

## Authentication Flow

### 1. Login Initiation (`/auth/login`)

```javascript
// User clicks "Login with EVE Online"
window.location.href = '/auth/login';

// Backend generates state token and redirects to EVE SSO
const state = evesso.generateState();
const authUrl = evesso.getAuthorizationUrl(state);
// Store state in cookie, redirect to authUrl
```

### 2. OAuth Callback (`/auth/callback`)

```javascript
// EVE SSO redirects back with code and state
const { code, state } = req.query;

// Validate state (CSRF protection)
if (state !== storedState) throw new Error('Invalid state');

// Exchange code for tokens
const tokens = await evesso.exchangeCodeForToken(code);
// tokens = { access_token, refresh_token, expires_in }

// Get character info
const characterInfo = await evesso.getCharacterInfo(tokens.access_token);

// Assign roles based on character ID
const roles = getRoles(characterInfo.CharacterID);

// Store in cookie
const authData = {
  accessToken: tokens.access_token,
  refreshToken: tokens.refresh_token,
  expiresAt: Date.now() + tokens.expires_in * 1000,
  character: { id, name, ownerHash },
  roles: roles,
};
```

### 3. Authentication Check (`/auth/verify`)

```javascript
// Frontend checks auth status
const response = await fetch('/auth/verify');
const data = await response.json();

if (data.authenticated) {
  console.log(`Logged in as: ${data.character.name}`);
} else {
  // Redirect to login
}
```

### 4. Protected API Requests

```javascript
// In API endpoint
const auth = await requireAuth(req, res);
if (!auth.authenticated) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Access character info
const characterId = auth.character.id;
```

### 5. Logout (`/auth/logout`)

```javascript
// Revoke refresh token with EVE SSO
await evesso.revokeRefreshToken(refreshToken);

// Clear cookie
res.setHeader('Set-Cookie', cookie.serialize('auth_data', '', { maxAge: 0 }));
```

## JWT Signature Verification

### JWKS-based Verification

```javascript
const jwks = require('./auth/jwks');

// Automatic signature verification
const payload = await jwks.verifyJWT(accessToken, clientId);
// - Fetches EVE's public key from JWKS endpoint
// - Verifies signature cryptographically
// - Validates issuer, audience, expiration
// - Returns verified payload
```

### Fallback Validation

```javascript
// If JWKS fails (network issues)
const payload = jwks.validateTokenBasic(accessToken, clientId);
// WARNING: Does not verify signature!
```

### JWT Claims Structure

```javascript
{
  sub: "CHARACTER:EVE:12345",        // Character ID
  name: "Character Name",            // Character name
  iss: "login.eveonline.com",        // Issuer
  exp: 1234567890,                   // Expiration (Unix timestamp)
  aud: ["client_id", "EVE Online"],  // Audience
  scp: ["publicData", "..."]         // Granted scopes
}
```

## Scope Management

### Available Scope Categories

```javascript
const {
  PUBLIC_DATA, // Basic public info
  CHARACTER_SCOPES, // Character-specific data
  CORPORATION_SCOPES, // Corporation data
  FLEET_SCOPES, // Fleet management
  UNIVERSE_SCOPES, // Structure data
  SCOPE_PRESETS, // Common combinations
} = require('./auth/scopes');
```

### Using Custom Scopes

```javascript
// Request specific scopes during login
const { CHARACTER_SCOPES } = require('./auth/scopes');
const authUrl = evesso.getAuthorizationUrl(state, [
  CHARACTER_SCOPES.WALLET,
  CHARACTER_SCOPES.ASSETS,
  CHARACTER_SCOPES.MARKET_ORDERS,
]);
```

### Scope Presets

```javascript
const { SCOPE_PRESETS } = require('./auth/scopes');

// Market trader preset
evesso.getAuthorizationUrl(state, SCOPE_PRESETS.MARKET_TRADER);
// Includes: publicData, market_orders, wallet, assets

// Contract manager preset
evesso.getAuthorizationUrl(state, SCOPE_PRESETS.CONTRACT_MANAGER);
// Includes: publicData, contracts, assets, wallet
```

### Checking Scopes in API

```javascript
const { hasRequiredScopes, CHARACTER_SCOPES } = require('./auth/scopes');

// Verify token has required scopes
if (!hasRequiredScopes(payload.scp, [CHARACTER_SCOPES.WALLET])) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

## Security Features

### CSRF Protection

- State parameter generated per request
- Stored in httpOnly cookie
- Validated on callback
- 10-minute expiration

### Cookie Security

```javascript
{
  httpOnly: true,        // Not accessible to JavaScript
  secure: true,          // HTTPS only
  sameSite: 'lax',       // CSRF protection
  maxAge: 7 * 24 * 60 * 60  // 7 days
}
```

### Token Management

- Access tokens: 20 minutes (short-lived)
- Refresh tokens: Long-lived, automatically rotated
- Automatic refresh on expiration
- Token revocation on logout

### JWT Verification

- Cryptographic signature verification
- Issuer validation
- Audience validation
- Expiration checking
- JWKS caching (5 minutes)

## Environment Variables

```env
# Required
EVE_CLIENT_ID=your_client_id
EVE_SECRET_KEY=your_client_secret
EVE_CALLBACK_URL=http://localhost:3000/auth/callback

# Production
EVE_CALLBACK_URL=https://yourdomain.com/auth/callback

# Optional - Admin Configuration
ADMIN_CHARACTER_IDS=12345,67890,11111
```

## Usage Examples

### Basic Login (Public Data Only)

```javascript
// Default - only publicData scope
window.location.href = '/auth/login';
```

### Login with Custom Scopes

```javascript
// Modify api/auth/login.js to request specific scopes
const { CHARACTER_SCOPES } = require('../../lib/auth/scopes');
const authUrl = evesso.getAuthorizationUrl(state, [
  CHARACTER_SCOPES.WALLET,
  CHARACTER_SCOPES.ASSETS,
]);
```

### Protected API Endpoint

```javascript
const { requireAuth } = require('../../lib/auth/middleware');

module.exports = async (req, res) => {
  const auth = await requireAuth(req, res);

  if (!auth.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check specific scopes if needed
  const { hasRequiredScopes, CHARACTER_SCOPES } = require('../../lib/auth/scopes');
  const payload = await evesso.validateAccessToken(auth.accessToken);

  if (!hasRequiredScopes(payload.scp, [CHARACTER_SCOPES.WALLET])) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Access granted
  res.json({ characterId: auth.character.id });
};
```

### Admin-Only API Endpoint

```javascript
const { requireAdmin } = require('../../lib/auth/middleware');

module.exports = async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return; // Response already sent (401 or 403)

  // Admin-only logic here
  res.json({
    message: 'Admin access granted',
    admin: auth.character.name,
  });
};
```

### Manual Token Refresh

```javascript
// Automatic refresh in middleware, but manual option available:
const newTokens = await evesso.refreshAccessToken(refreshToken);
// Note: Old refresh token is invalidated, use new one
```

## Login Button Requirements

Per EVE SSO guidelines, always use official login buttons:

```jsx
<button onClick={handleLogin} className="eve-sso-button">
  <img
    src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
    alt="Log in with EVE Online"
  />
</button>
```

See `EVE_LOGIN_BUTTONS.md` for complete button guidelines.

## Error Handling

### Common Errors

| Error               | Cause                     | Solution                              |
| ------------------- | ------------------------- | ------------------------------------- |
| Invalid state       | CSRF token mismatch       | Clear cookies, try again              |
| Token expired       | Access token > 20 min old | Automatic refresh triggered           |
| Refresh failed      | Refresh token revoked     | User must re-login                    |
| Invalid signature   | JWKS verification failed  | Check JWKS endpoint, verify client_id |
| Insufficient scopes | Missing required scopes   | Request additional scopes             |

### Debugging

Enable debug logging:

```javascript
// All auth operations log to console
// Check browser console and server logs
```

## Testing

### Test Authentication Flow

```javascript
// 1. Navigate to /auth/login
// 2. Login with EVE credentials
// 3. Check /auth/verify returns authenticated: true
// 4. Access protected endpoint
// 5. Logout via /auth/logout
// 6. Verify /auth/verify returns authenticated: false
```

### Test Token Refresh

```javascript
// Wait 20+ minutes after login
// Access protected endpoint
// Middleware should automatically refresh token
// Check Set-Cookie header for new auth_data
```

### Test JWKS Verification

```javascript
const jwks = require('./lib/auth/jwks');

// Fetch JWKS
const keys = await jwks.fetchJWKS();
console.log(keys); // Should show RSA public keys

// Verify token
const payload = await jwks.verifyJWT(accessToken, clientId);
console.log(payload); // Should show verified claims
```

## Migration Guide

### From Basic Auth to JWKS Verification

The system automatically uses JWKS verification with fallback:

1. **Current**: Basic validation (no signature check)
2. **New**: Automatic JWKS signature verification
3. **Fallback**: Reverts to basic if JWKS fails

No code changes required - verification happens automatically in `validateAccessToken()`.

### Adding New Scopes

1. Add to `scopes.js`:

```javascript
const NEW_SCOPE = {
  MY_SCOPE: 'esi-new.scope.v1',
};
```

2. Add to EVE Developers Portal application

3. Request in login:

```javascript
evesso.getAuthorizationUrl(state, [NEW_SCOPE.MY_SCOPE]);
```

## References

- [EVE SSO Documentation](https://docs.esi.evetech.net/docs/sso/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [JWT Specification](https://jwt.io/)
- [JWKS Specification](https://datatracker.ietf.org/doc/html/rfc7517)
- [EVE Developers Portal](https://developers.eveonline.com/)

## Support

For issues or questions:

1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Ensure EVE SSO application is configured properly
4. Check that callback URL matches exactly (including protocol)
5. Verify scopes are assigned to application in EVE Developers Portal

## Role-Based Access Control (RBAC)

### Admin Configuration

Configure admin character IDs in `.env`:

```env
ADMIN_CHARACTER_IDS=12345,67890,11111
```

### Two-Tier Login System

The system supports two login endpoints with different scope requirements:

**Regular Login** (`/auth/login`):

- Minimal scopes: publicData, location, ship type, skills, assets, wallet
- Suitable for general users
- Faster authorization (fewer permissions to consent)

**Admin Login** (`/auth/admin-login`):

- Extended scopes: All enabled scopes from EVE SSO application
- Required for admin operations that need extended ESI access
- Users must consent to all requested permissions

Both endpoints use the same callback handler (`/auth/callback`). Admin roles are assigned based on character ID after authentication, regardless of which login endpoint was used.

### Available Roles

- `user` - Default role for all authenticated users
- `admin` - Administrative privileges (configured via ADMIN_CHARACTER_IDS)

### Role Assignment

Roles are automatically assigned during authentication callback based on character ID:

```javascript
const { getRoles, ROLES } = require('./auth/roles');

// Check roles
const roles = getRoles(characterId);
// Returns: ['user'] or ['user', 'admin']

// Check specific role
const isAdmin = roles.includes(ROLES.ADMIN);
```

### Using Admin Middleware

```javascript
const { requireAdmin } = require('../../lib/auth/middleware');

module.exports = async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return; // 401 (not authenticated) or 403 (not admin)

  // Admin-only operations
  res.json({ message: 'Admin access granted' });
};
```

### Example Admin Endpoint

See `api/admin/status.js` for a complete example of an admin-only endpoint.

### Admin Login Flow

For admin users who need extended ESI access:

1. **Navigate to admin login**:

   ```javascript
   window.location.href = '/auth/admin-login';
   ```

2. **User authorizes extended scopes** - EVE SSO will show all requested permissions

3. **Character ID is checked** - After callback, system checks if character ID is in ADMIN_CHARACTER_IDS

4. **Roles assigned** - User gets both 'user' and 'admin' roles if authorized

**Important**: Regular login (/auth/login) with admin character ID will still grant admin role, but the access token will only have minimal scopes. Use /auth/admin-login for full scope access.

## Changelog

### v2.1.0 (Current)

- ✅ Added Role-Based Access Control (RBAC) system
- ✅ Implemented admin role configuration
- ✅ Added `requireAdmin` middleware for admin-only endpoints
- ✅ Enhanced authentication response to include roles

### v2.0.0

- ✅ Added JWT signature verification with JWKS
- ✅ Implemented comprehensive scope management
- ✅ Added scope presets for common use cases
- ✅ Enhanced documentation with examples
- ✅ Added official EVE login button guidelines

### v1.0.0

- Initial OAuth 2.0 implementation
- Basic token validation
- Cookie-based session management
- Automatic token refresh
