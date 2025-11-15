# EVE Online SSO Login Buttons

## Official Requirements

Per EVE Online SSO documentation, third-party applications **MUST** use the official "Log in with EVE Online" button images provided by CCP Games. This creates consistency for EVE players across all third-party applications.

## Available Button Images

CCP Games provides four official login button variants:

### Large Buttons (Recommended for desktop)

**White Background (Large)**

```
https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png
```

**Black Background (Large)**

```
https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-large.png
```

### Small Buttons (Recommended for mobile)

**White Background (Small)**

```
https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-small.png
```

**Black Background (Small)**

```
https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-small.png
```

## Implementation

### React/JSX Example

```jsx
function LoginButton() {
  const handleLogin = () => {
    window.location.href = '/auth/login';
  };

  return (
    <button onClick={handleLogin} className="eve-sso-button">
      <img
        src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
        alt="Log in with EVE Online"
      />
    </button>
  );
}
```

### HTML Example

```html
<a href="/auth/login">
  <img
    src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-large.png"
    alt="Log in with EVE Online"
  />
</a>
```

## Usage Guidelines

1. **Use Official Images**: Always use the official button images from CCP's CDN
2. **Do Not Modify**: Do not alter, recreate, or modify the button design
3. **Maintain Aspect Ratio**: Do not stretch or distort the button images
4. **Accessibility**: Always include descriptive alt text (e.g., "Log in with EVE Online")
5. **Choose Appropriate Size**: Use large buttons for desktop, small for mobile/compact layouts
6. **Match Theme**: Choose white or black version based on your site's color scheme

## Button Selection Guide

| Use Case                         | Recommended Button                   |
| -------------------------------- | ------------------------------------ |
| Desktop web app with light theme | White Large                          |
| Desktop web app with dark theme  | Black Large                          |
| Mobile web app with light theme  | White Small                          |
| Mobile web app with dark theme   | Black Small                          |
| Responsive design                | Use CSS to swap based on screen size |

## Styling Best Practices

### CSS Example (Responsive)

```css
.eve-sso-button {
  display: inline-block;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s;
}

.eve-sso-button:hover {
  opacity: 0.8;
}

.eve-sso-button img {
  display: block;
  max-width: 100%;
  height: auto;
}

/* Responsive sizing */
@media (max-width: 768px) {
  .eve-sso-button img {
    max-width: 270px; /* Small button size */
  }
}

@media (min-width: 769px) {
  .eve-sso-button img {
    max-width: 350px; /* Large button size */
  }
}
```

## Related Documentation

- [EVE SSO Documentation](https://docs.esi.evetech.net/docs/sso/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [lib/auth/sso.js](./sso.js) - EVE SSO implementation
- [api/auth/login.js](../../api/auth/login.js) - Login endpoint

## Current Implementation

Our application currently uses a text-based login button. **TODO**: Replace with official EVE SSO button image following the guidelines above.

**Current location**: `client/src/pages/LandingPage.jsx`

**Recommended update**:

```jsx
// Replace existing login button with:
<button onClick={handleLogin} className="eve-sso-button">
  <img
    src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
    alt="Log in with EVE Online"
  />
</button>
```
