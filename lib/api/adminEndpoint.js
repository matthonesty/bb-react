/**
 * @fileoverview Admin Endpoint Wrapper
 *
 * Provides a higher-order function to wrap admin endpoints with common functionality:
 * - CORS handling
 * - Authentication checking
 * - Permission validation
 * - Database connection
 * - Error handling
 *
 * This eliminates code duplication across all admin API endpoints.
 *
 * @example Basic usage
 * const { createAdminEndpoint } = require('../../lib/api/adminEndpoint');
 * const { Permissions } = require('../../lib/auth/permissions');
 *
 * module.exports = createAdminEndpoint({
 *   permission: Permissions.canViewWallet,
 *   handler: async (req, res, { auth, db }) => {
 *     const data = await db.query('SELECT * FROM table');
 *     return res.json({ success: true, data: data.rows });
 *   }
 * });
 *
 * @example With method-specific handlers
 * module.exports = createAdminEndpoint({
 *   permission: Permissions.canAccessSystem,
 *   handlers: {
 *     GET: async (req, res, { auth, db }) => {
 *       // Handle GET request
 *     },
 *     POST: {
 *       permission: Permissions.canManageFCs,
 *       handler: async (req, res, { auth, db }) => {
 *         // Handle POST request (with different permission)
 *       }
 *     }
 *   }
 * });
 */

const Database = require('../../src/database');
const { corsMiddleware } = require('../../lib/middleware/cors');
const { requireAuth } = require('../../lib/auth/middleware');
const { internalError } = require('../../lib/utils/errorResponse');

/**
 * Create an admin endpoint with common middleware and error handling
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.permission - Permission check function (takes auth object)
 * @param {Function} [options.handler] - Main handler function (for single-method endpoints)
 * @param {Object} [options.handlers] - Method-specific handlers (for multi-method endpoints)
 * @param {boolean} [options.requireDb=true] - Whether to provide database connection
 * @param {boolean} [options.enableCors=true] - Whether to enable CORS
 * @param {string} [options.errorContext] - Context string for error logging
 *
 * @returns {Function} Express/Vercel handler function
 *
 * @example Single-method endpoint
 * module.exports = createAdminEndpoint({
 *   permission: Permissions.canViewWallet,
 *   handler: async (req, res, { auth, db }) => {
 *     const result = await db.query('SELECT * FROM wallet');
 *     return res.json({ success: true, data: result.rows });
 *   }
 * });
 *
 * @example Multi-method endpoint with different permissions
 * module.exports = createAdminEndpoint({
 *   permission: Permissions.canAccessSystem,
 *   handlers: {
 *     GET: async (req, res, { auth, db }) => {
 *       // All authenticated users can GET
 *     },
 *     POST: {
 *       permission: Permissions.canManageFCs,
 *       handler: async (req, res, { auth, db }) => {
 *         // Only admins/council can POST
 *       }
 *     },
 *     DELETE: {
 *       permission: Permissions.canManageFCs,
 *       handler: async (req, res, { auth, db }) => {
 *         // Only admins/council can DELETE
 *       }
 *     }
 *   },
 *   errorContext: 'Fleet Commanders'
 * });
 */
function createAdminEndpoint(options) {
  const {
    permission,
    handler,
    handlers,
    requireDb = true,
    enableCors = true,
    errorContext = 'Admin API'
  } = options;

  // Validate options
  if (!permission && !handlers) {
    throw new Error('createAdminEndpoint: Must provide either permission or handlers');
  }

  if (handler && handlers) {
    throw new Error('createAdminEndpoint: Cannot provide both handler and handlers');
  }

  return async (req, res) => {
    try {
      // Handle CORS
      if (enableCors && corsMiddleware(req, res)) {
        return;
      }

      // Require authentication
      const auth = await requireAuth(req, res);
      if (!auth || !auth.authenticated) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      // Get database connection if needed
      let db = null;
      if (requireDb) {
        db = await Database.getInstance();
      }

      // Prepare context object for handlers
      const context = { auth, db };

      // Handle single-method endpoint
      if (handler) {
        // Check base permission
        if (permission && !permission(auth)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }

        return await handler(req, res, context);
      }

      // Handle multi-method endpoint
      if (handlers) {
        const method = req.method;
        const methodHandler = handlers[method];

        if (!methodHandler) {
          return res.status(405).json({
            success: false,
            error: 'Method not allowed'
          });
        }

        // Check base permission (applies to all methods unless overridden)
        if (permission && !permission(auth)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }

        // Method handler can be a function or object with permission + handler
        if (typeof methodHandler === 'function') {
          return await methodHandler(req, res, context);
        }

        // Method has its own permission check
        if (methodHandler.permission && !methodHandler.permission(auth)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions for this operation'
          });
        }

        return await methodHandler.handler(req, res, context);
      }

    } catch (error) {
      console.error(`[${errorContext}] Error:`, error);
      return internalError(res, `${errorContext} failed`, error);
    }
  };
}

/**
 * Helper to create simple GET-only admin endpoint
 *
 * @param {Function} permission - Permission check function
 * @param {Function} handler - Handler function
 * @param {string} [errorContext] - Error context for logging
 * @returns {Function} Express/Vercel handler
 *
 * @example
 * module.exports = createGetEndpoint(
 *   Permissions.canViewWallet,
 *   async (req, res, { auth, db }) => {
 *     const data = await db.query('SELECT * FROM wallet');
 *     return res.json({ success: true, data: data.rows });
 *   }
 * );
 */
function createGetEndpoint(permission, handler, errorContext) {
  return createAdminEndpoint({
    permission,
    handler,
    errorContext
  });
}

/**
 * Helper to create CRUD endpoint with standard permissions
 *
 * @param {Object} options - Configuration
 * @param {Function} options.readPermission - Permission for GET operations
 * @param {Function} options.writePermission - Permission for POST/PUT/DELETE operations
 * @param {Object} options.handlers - Method handlers (GET, POST, PUT, DELETE)
 * @param {string} [options.errorContext] - Error context for logging
 * @returns {Function} Express/Vercel handler
 *
 * @example
 * module.exports = createCrudEndpoint({
 *   readPermission: Permissions.canAccessSystem,
 *   writePermission: Permissions.canManageFCs,
 *   handlers: {
 *     GET: async (req, res, { auth, db }) => { ... },
 *     POST: async (req, res, { auth, db }) => { ... },
 *     PUT: async (req, res, { auth, db }) => { ... },
 *     DELETE: async (req, res, { auth, db }) => { ... }
 *   },
 *   errorContext: 'Fleet Commanders'
 * });
 */
function createCrudEndpoint(options) {
  const {
    readPermission,
    writePermission,
    handlers,
    errorContext
  } = options;

  const wrappedHandlers = {};

  if (handlers.GET) {
    wrappedHandlers.GET = handlers.GET;
  }

  if (handlers.POST) {
    wrappedHandlers.POST = {
      permission: writePermission,
      handler: handlers.POST
    };
  }

  if (handlers.PUT) {
    wrappedHandlers.PUT = {
      permission: writePermission,
      handler: handlers.PUT
    };
  }

  if (handlers.DELETE) {
    wrappedHandlers.DELETE = {
      permission: writePermission,
      handler: handlers.DELETE
    };
  }

  return createAdminEndpoint({
    permission: readPermission,
    handlers: wrappedHandlers,
    errorContext
  });
}

module.exports = {
  createAdminEndpoint,
  createGetEndpoint,
  createCrudEndpoint
};
