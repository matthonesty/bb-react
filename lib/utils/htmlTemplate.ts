/**
 * @fileoverview HTML Template Utilities
 *
 * Generates HTML pages for redirects and error messages.
 * Used primarily in authentication flows for user-facing responses.
 *
 * Security:
 * - All user-provided values should be escaped before passing to these functions
 * - Redirect URLs should be validated before use
 *
 * @module lib/utils/htmlTemplate
 */

export interface RedirectPageOptions {
  title: string;
  heading: string;
  message: string;
  redirectUrl?: string;
  redirectDelay?: number;
  useScript?: boolean;
}

/**
 * Generate HTML redirect/error page
 *
 * Creates a simple HTML page with auto-redirect functionality.
 * Supports both meta refresh and JavaScript redirect for reliability.
 *
 * @param options - Template options
 * @returns Complete HTML page as string
 *
 * @example
 * // Success redirect
 * renderRedirectPage({
 *   title: 'Login Successful',
 *   heading: 'Login Successful!',
 *   message: 'Redirecting to home page...',
 *   redirectUrl: '/',
 *   redirectDelay: 0,
 *   useScript: true
 * });
 *
 * @example
 * // Error with delayed redirect
 * renderRedirectPage({
 *   title: 'Authentication Error',
 *   heading: 'Authentication Error',
 *   message: 'Invalid state parameter. Redirecting...',
 *   redirectUrl: '/',
 *   redirectDelay: 3
 * });
 */
export function renderRedirectPage({
  title,
  heading,
  message,
  redirectUrl = '/',
  redirectDelay = 3,
  useScript = false,
}: RedirectPageOptions): string {
  // Generate script tag if requested (useful for immediate redirects)
  const scriptTag = useScript ? `<script>window.location.href = '${redirectUrl}';</script>` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <meta http-equiv="refresh" content="${redirectDelay};url=${redirectUrl}" />
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0a0e27;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            text-align: center;
            max-width: 500px;
            padding: 2rem;
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: #00d4ff;
          }
          p {
            font-size: 1.1rem;
            color: #a0aec0;
            line-height: 1.6;
            white-space: pre-line;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${heading}</h1>
          <p>${message}</p>
        </div>
        ${scriptTag}
      </body>
    </html>
  `.trim();
}

/**
 * Generate authentication error page
 *
 * Convenience wrapper for common authentication error pattern.
 * Auto-redirects after 3 seconds (or immediately if delay=0).
 *
 * @param heading - Error heading to display
 * @param message - Optional detailed error message
 * @param redirectUrl - URL to redirect to
 * @param redirectDelay - Seconds before redirect
 * @returns HTML error page
 *
 * @example
 * renderAuthError('Invalid state parameter');
 * renderAuthError('Login Required', 'Please log in to continue', '/auth/login', 3);
 */
export function renderAuthError(
  heading: string,
  message: string | null = null,
  redirectUrl = '/',
  redirectDelay = 3
): string {
  // Support old single-parameter call for backward compatibility
  if (
    typeof heading === 'string' &&
    message === null &&
    redirectUrl === '/' &&
    redirectDelay === 3
  ) {
    return renderRedirectPage({
      title: 'Authentication Error',
      heading: 'Authentication Error',
      message: `${heading}. Redirecting to home page...`,
      redirectUrl: '/',
      redirectDelay: 3,
    });
  }

  const displayMessage = message ? `${message}. Redirecting...` : 'Redirecting...';

  return renderRedirectPage({
    title: heading,
    heading: heading,
    message: displayMessage,
    redirectUrl: redirectUrl,
    redirectDelay: redirectDelay,
  });
}

/**
 * Generate authentication success page
 *
 * Convenience wrapper for successful login.
 * Redirects immediately with both meta refresh and JavaScript.
 *
 * @param redirectUrl - Where to redirect after login
 * @returns HTML success page
 *
 * @example
 * renderAuthSuccess('/data');
 */
export function renderAuthSuccess(redirectUrl = '/'): string {
  return renderRedirectPage({
    title: 'Login Successful',
    heading: 'Login Successful!',
    message: 'Redirecting to home page...',
    redirectUrl: redirectUrl,
    redirectDelay: 0,
    useScript: true,
  });
}

/**
 * Generate authentication failure page
 *
 * Convenience wrapper for failed authentication.
 * Shows error message and redirects after 5 seconds.
 *
 * @param errorMessage - Technical error message
 * @returns HTML failure page
 *
 * @example
 * renderAuthFailure('Token exchange failed');
 */
export function renderAuthFailure(errorMessage: string): string {
  return renderRedirectPage({
    title: 'Authentication Failed',
    heading: 'Authentication Failed',
    message: `${errorMessage}\n\nRedirecting to home page in 5 seconds...`,
    redirectUrl: '/',
    redirectDelay: 5,
  });
}
