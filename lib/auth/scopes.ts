/**
 * @fileoverview EVE Online SSO Scopes Management
 *
 * Manages OAuth 2.0 scopes for EVE SSO authentication.
 * Scopes define what data the application can access on behalf of the user.
 *
 * Scope Categories:
 * - Public Data: Basic character information (no scope required)
 * - Character: Character-specific data (skills, wallet, location, etc.)
 * - Corporation: Corporation management data
 * - Fleet: Fleet management
 * - Industry: Manufacturing and research
 * - Market: Market orders and transactions
 * - Universe: Structure and bookmark data
 *
 * Security Note:
 * - Only request scopes you actually need (principle of least privilege)
 * - Users must explicitly consent to each scope
 * - Application can only request scopes assigned in EVE Developers Portal
 * - Scopes are returned in JWT token (scp claim)
 *
 * @see {@link https://docs.esi.evetech.net/docs/sso/} EVE SSO documentation
 * @see {@link https://docs.esi.evetech.net/docs/scopes/} Complete scope list
 */

/**
 * Public data scope (no explicit consent required)
 * Provides basic character information without requiring scope selection
 */
export const PUBLIC_DATA = 'publicData';

/**
 * Character-related scopes
 * Access to character assets, skills, location, wallet, etc.
 * Source: https://esi.evetech.net/latest/swagger.json
 */
export const CHARACTER_SCOPES = {
  // Assets
  ASSETS: 'esi-assets.read_assets.v1',

  // Blueprints
  BLUEPRINTS: 'esi-characters.read_blueprints.v1',

  // Calendar
  CALENDAR_READ: 'esi-calendar.read_calendar_events.v1',
  CALENDAR_RESPOND: 'esi-calendar.respond_calendar_events.v1',

  // Clones
  CLONES: 'esi-clones.read_clones.v1',
  IMPLANTS: 'esi-clones.read_implants.v1',

  // Contacts
  CONTACTS_READ: 'esi-characters.read_contacts.v1',
  CONTACTS_WRITE: 'esi-characters.write_contacts.v1',

  // Contracts
  CONTRACTS: 'esi-contracts.read_character_contracts.v1',

  // Corporation Roles
  CORPORATION_ROLES: 'esi-characters.read_corporation_roles.v1',

  // Fatigue (jump fatigue)
  FATIGUE: 'esi-characters.read_fatigue.v1',

  // Faction Warfare
  FW_STATS: 'esi-characters.read_fw_stats.v1',

  // Fittings
  FITTINGS_READ: 'esi-fittings.read_fittings.v1',
  FITTINGS_WRITE: 'esi-fittings.write_fittings.v1',

  // Industry
  INDUSTRY_JOBS: 'esi-industry.read_character_jobs.v1',
  MINING_LEDGER: 'esi-industry.read_character_mining.v1',

  // Killmails
  KILLMAILS: 'esi-killmails.read_killmails.v1',

  // Location
  LOCATION: 'esi-location.read_location.v1',
  ONLINE: 'esi-location.read_online.v1',
  SHIP_TYPE: 'esi-location.read_ship_type.v1',

  // Loyalty Points
  LOYALTY_POINTS: 'esi-characters.read_loyalty.v1',

  // Mail
  MAIL_READ: 'esi-mail.read_mail.v1',
  MAIL_SEND: 'esi-mail.send_mail.v1',
  MAIL_ORGANIZE: 'esi-mail.organize_mail.v1',

  // Market
  MARKET_ORDERS: 'esi-markets.read_character_orders.v1',

  // Medals
  MEDALS: 'esi-characters.read_medals.v1',

  // Notifications
  NOTIFICATIONS: 'esi-characters.read_notifications.v1',

  // Planetary Interaction
  PLANETS_MANAGE: 'esi-planets.manage_planets.v1',
  PLANETS_CUSTOMS: 'esi-planets.read_customs_offices.v1',

  // Research
  RESEARCH: 'esi-characters.read_agents_research.v1',

  // Search
  SEARCH_STRUCTURES: 'esi-search.search_structures.v1',

  // Skills
  SKILLS: 'esi-skills.read_skills.v1',
  SKILLQUEUE: 'esi-skills.read_skillqueue.v1',

  // Standings
  STANDINGS: 'esi-characters.read_standings.v1',

  // Titles
  TITLES: 'esi-characters.read_titles.v1',

  // UI
  UI_WAYPOINT: 'esi-ui.write_waypoint.v1',
  UI_OPEN_WINDOW: 'esi-ui.open_window.v1',

  // Wallet
  WALLET: 'esi-wallet.read_character_wallet.v1'
} as const;

/**
 * Corporation-related scopes
 * Access to corporation assets, wallets, and management
 * Source: https://esi.evetech.net/latest/swagger.json
 */
export const CORPORATION_SCOPES = {
  // Assets
  ASSETS: 'esi-assets.read_corporation_assets.v1',

  // Blueprints
  BLUEPRINTS: 'esi-corporations.read_blueprints.v1',

  // Contacts
  CONTACTS: 'esi-corporations.read_contacts.v1',

  // Container Logs
  CONTAINER_LOGS: 'esi-corporations.read_container_logs.v1',

  // Contracts
  CONTRACTS: 'esi-contracts.read_corporation_contracts.v1',

  // Divisions (wallet divisions)
  DIVISIONS: 'esi-corporations.read_divisions.v1',

  // Facilities
  FACILITIES: 'esi-corporations.read_facilities.v1',

  // Faction Warfare
  FW_STATS: 'esi-corporations.read_fw_stats.v1',

  // Industry
  INDUSTRY_JOBS: 'esi-industry.read_corporation_jobs.v1',
  MINING_LEDGER: 'esi-industry.read_corporation_mining.v1',

  // Killmails
  KILLMAILS: 'esi-killmails.read_corporation_killmails.v1',

  // Market
  MARKET_ORDERS: 'esi-markets.read_corporation_orders.v1',
  STRUCTURE_MARKETS: 'esi-markets.structure_markets.v1',

  // Medals
  MEDALS: 'esi-corporations.read_medals.v1',

  // Membership
  MEMBERSHIP: 'esi-corporations.read_corporation_membership.v1',
  TRACK_MEMBERS: 'esi-corporations.track_members.v1',

  // Standings
  STANDINGS: 'esi-corporations.read_standings.v1',

  // Starbases (POSes)
  STARBASES: 'esi-corporations.read_starbases.v1',

  // Structures
  STRUCTURES: 'esi-corporations.read_structures.v1',

  // Titles
  TITLES: 'esi-corporations.read_titles.v1',

  // Wallet
  WALLETS: 'esi-wallet.read_corporation_wallets.v1'
} as const;

/**
 * Alliance-related scopes
 * Alliance contacts and information
 * Source: https://esi.evetech.net/latest/swagger.json
 */
export const ALLIANCE_SCOPES = {
  CONTACTS: 'esi-alliances.read_contacts.v1'
} as const;

/**
 * Fleet-related scopes
 * Fleet management and participation
 * Source: https://esi.evetech.net/latest/swagger.json
 */
export const FLEET_SCOPES = {
  READ: 'esi-fleets.read_fleet.v1',
  WRITE: 'esi-fleets.write_fleet.v1'
} as const;

/**
 * Universe-related scopes
 * Structure information
 * Source: https://esi.evetech.net/latest/swagger.json
 */
export const UNIVERSE_SCOPES = {
  STRUCTURES: 'esi-universe.read_structures.v1'
} as const;

/**
 * Application-specific scope presets
 * Common scope combinations for different use cases
 */
export const SCOPE_PRESETS = {
  // Basic public data only (default)
  PUBLIC_ONLY: [PUBLIC_DATA],

  // Market trader
  MARKET_TRADER: [
    PUBLIC_DATA,
    CHARACTER_SCOPES.MARKET_ORDERS,
    CHARACTER_SCOPES.WALLET,
    CHARACTER_SCOPES.ASSETS
  ],

  // Contract manager
  CONTRACT_MANAGER: [
    PUBLIC_DATA,
    CHARACTER_SCOPES.CONTRACTS,
    CHARACTER_SCOPES.ASSETS,
    CHARACTER_SCOPES.WALLET
  ],

  // Corporation manager
  CORP_MANAGER: [
    PUBLIC_DATA,
    CHARACTER_SCOPES.CORPORATION_ROLES,
    CORPORATION_SCOPES.ASSETS,
    CORPORATION_SCOPES.WALLETS,
    CORPORATION_SCOPES.MARKET_ORDERS,
    CORPORATION_SCOPES.CONTRACTS
  ],

  // Industry manager
  INDUSTRY_MANAGER: [
    PUBLIC_DATA,
    CHARACTER_SCOPES.INDUSTRY_JOBS,
    CHARACTER_SCOPES.ASSETS,
    CHARACTER_SCOPES.SKILLS,
    CHARACTER_SCOPES.PLANETS_MANAGE
  ],

  // Fleet commander
  FLEET_COMMANDER: [
    PUBLIC_DATA,
    CHARACTER_SCOPES.LOCATION,
    CHARACTER_SCOPES.SHIP_TYPE,
    FLEET_SCOPES.READ,
    FLEET_SCOPES.WRITE
  ],

  // Full access (use with caution!)
  FULL_ACCESS: [
    PUBLIC_DATA,
    ...Object.values(ALLIANCE_SCOPES),
    ...Object.values(CHARACTER_SCOPES),
    ...Object.values(CORPORATION_SCOPES),
    ...Object.values(FLEET_SCOPES),
    ...Object.values(UNIVERSE_SCOPES)
  ]
} as const;

/**
 * Get scope description for display to users
 *
 * Provides human-readable descriptions of what each scope allows.
 * Useful for building consent screens or documentation.
 *
 * @param scope - ESI scope identifier
 * @returns Human-readable description
 *
 * @example
 * getScopeDescription(CHARACTER_SCOPES.WALLET)
 * // Returns: "Read your character's wallet balance and transactions"
 */
export function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    // Public
    [PUBLIC_DATA]: 'Basic character information (no private data)',

    // Alliance
    [ALLIANCE_SCOPES.CONTACTS]: 'Read alliance contacts',

    // Character - Assets & Inventory
    [CHARACTER_SCOPES.ASSETS]: 'Read character assets and inventory',
    [CHARACTER_SCOPES.BLUEPRINTS]: 'Read character blueprints',

    // Character - Calendar
    [CHARACTER_SCOPES.CALENDAR_READ]: 'Read calendar events',
    [CHARACTER_SCOPES.CALENDAR_RESPOND]: 'Respond to calendar events',

    // Character - Clones & Implants
    [CHARACTER_SCOPES.CLONES]: 'Read clone information',
    [CHARACTER_SCOPES.IMPLANTS]: 'Read installed implants',

    // Character - Contacts
    [CHARACTER_SCOPES.CONTACTS_READ]: 'Read character contacts',
    [CHARACTER_SCOPES.CONTACTS_WRITE]: 'Manage character contacts',

    // Character - Contracts
    [CHARACTER_SCOPES.CONTRACTS]: 'Read character contracts',

    // Character - Corporation
    [CHARACTER_SCOPES.CORPORATION_ROLES]: 'Read corporation roles',

    // Character - Jump & Fatigue
    [CHARACTER_SCOPES.FATIGUE]: 'Read jump fatigue',

    // Character - Faction Warfare
    [CHARACTER_SCOPES.FW_STATS]: 'Read faction warfare statistics',

    // Character - Fittings
    [CHARACTER_SCOPES.FITTINGS_READ]: 'Read ship fittings',
    [CHARACTER_SCOPES.FITTINGS_WRITE]: 'Manage ship fittings',

    // Character - Industry
    [CHARACTER_SCOPES.INDUSTRY_JOBS]: 'Read industry jobs',
    [CHARACTER_SCOPES.MINING_LEDGER]: 'Read mining ledger',

    // Character - Killmails
    [CHARACTER_SCOPES.KILLMAILS]: 'Read killmails',

    // Character - Location
    [CHARACTER_SCOPES.LOCATION]: 'Read character location',
    [CHARACTER_SCOPES.ONLINE]: 'Read online status',
    [CHARACTER_SCOPES.SHIP_TYPE]: 'Read current ship type',

    // Character - Loyalty Points
    [CHARACTER_SCOPES.LOYALTY_POINTS]: 'Read loyalty points',

    // Character - Mail
    [CHARACTER_SCOPES.MAIL_READ]: 'Read EVE mail',
    [CHARACTER_SCOPES.MAIL_SEND]: 'Send EVE mail',
    [CHARACTER_SCOPES.MAIL_ORGANIZE]: 'Organize EVE mail',

    // Character - Market
    [CHARACTER_SCOPES.MARKET_ORDERS]: 'Read character market orders',

    // Character - Medals
    [CHARACTER_SCOPES.MEDALS]: 'Read character medals',

    // Character - Notifications
    [CHARACTER_SCOPES.NOTIFICATIONS]: 'Read character notifications',

    // Character - Planets
    [CHARACTER_SCOPES.PLANETS_MANAGE]: 'Manage planetary colonies',
    [CHARACTER_SCOPES.PLANETS_CUSTOMS]: 'Read customs offices',

    // Character - Research
    [CHARACTER_SCOPES.RESEARCH]: 'Read research agents',

    // Character - Search
    [CHARACTER_SCOPES.SEARCH_STRUCTURES]: 'Search structures',

    // Character - Skills
    [CHARACTER_SCOPES.SKILLS]: 'Read character skills',
    [CHARACTER_SCOPES.SKILLQUEUE]: 'Read skill queue',

    // Character - Standings
    [CHARACTER_SCOPES.STANDINGS]: 'Read character standings',

    // Character - Titles
    [CHARACTER_SCOPES.TITLES]: 'Read character titles',

    // Character - UI
    [CHARACTER_SCOPES.UI_WAYPOINT]: 'Set waypoints in game',
    [CHARACTER_SCOPES.UI_OPEN_WINDOW]: 'Open game windows',

    // Character - Wallet
    [CHARACTER_SCOPES.WALLET]: 'Read character wallet',

    // Corporation - Assets
    [CORPORATION_SCOPES.ASSETS]: 'Read corporation assets',
    [CORPORATION_SCOPES.BLUEPRINTS]: 'Read corporation blueprints',

    // Corporation - Contacts
    [CORPORATION_SCOPES.CONTACTS]: 'Read corporation contacts',

    // Corporation - Containers
    [CORPORATION_SCOPES.CONTAINER_LOGS]: 'Read container logs',

    // Corporation - Contracts
    [CORPORATION_SCOPES.CONTRACTS]: 'Read corporation contracts',

    // Corporation - Divisions
    [CORPORATION_SCOPES.DIVISIONS]: 'Read corporation divisions',

    // Corporation - Facilities
    [CORPORATION_SCOPES.FACILITIES]: 'Read corporation facilities',

    // Corporation - Faction Warfare
    [CORPORATION_SCOPES.FW_STATS]: 'Read corporation faction warfare stats',

    // Corporation - Industry
    [CORPORATION_SCOPES.INDUSTRY_JOBS]: 'Read corporation industry jobs',
    [CORPORATION_SCOPES.MINING_LEDGER]: 'Read corporation mining ledger',

    // Corporation - Killmails
    [CORPORATION_SCOPES.KILLMAILS]: 'Read corporation killmails',

    // Corporation - Market
    [CORPORATION_SCOPES.MARKET_ORDERS]: 'Read corporation market orders',
    [CORPORATION_SCOPES.STRUCTURE_MARKETS]: 'Access structure markets',

    // Corporation - Medals
    [CORPORATION_SCOPES.MEDALS]: 'Read corporation medals',

    // Corporation - Members
    [CORPORATION_SCOPES.MEMBERSHIP]: 'Read corporation membership',
    [CORPORATION_SCOPES.TRACK_MEMBERS]: 'Track corporation members',

    // Corporation - Standings
    [CORPORATION_SCOPES.STANDINGS]: 'Read corporation standings',

    // Corporation - Starbases
    [CORPORATION_SCOPES.STARBASES]: 'Read starbases (POSes)',

    // Corporation - Structures
    [CORPORATION_SCOPES.STRUCTURES]: 'Read corporation structures',

    // Corporation - Titles
    [CORPORATION_SCOPES.TITLES]: 'Read corporation titles',

    // Corporation - Wallet
    [CORPORATION_SCOPES.WALLETS]: 'Read corporation wallets',

    // Fleet
    [FLEET_SCOPES.READ]: 'Read fleet information',
    [FLEET_SCOPES.WRITE]: 'Manage fleet',

    // Universe
    [UNIVERSE_SCOPES.STRUCTURES]: 'Read universe structures'
  };

  return descriptions[scope] || `Access to ${scope}`;
}

/**
 * Validate scope string
 *
 * Checks if a scope string is valid and recognized by EVE SSO.
 * Useful for validating user input or configuration.
 *
 * @param scope - Scope to validate
 * @returns True if scope is valid
 *
 * @example
 * isValidScope('esi-assets.read_assets.v1') // Returns: true
 * isValidScope('invalid.scope') // Returns: false
 */
export function isValidScope(scope: string): boolean {
  if (scope === PUBLIC_DATA) return true;

  const allScopes: string[] = [
    ...Object.values(ALLIANCE_SCOPES),
    ...Object.values(CHARACTER_SCOPES),
    ...Object.values(CORPORATION_SCOPES),
    ...Object.values(FLEET_SCOPES),
    ...Object.values(UNIVERSE_SCOPES)
  ];

  return allScopes.includes(scope);
}

/**
 * Build space-separated scope string for OAuth request
 *
 * Converts array of scopes to space-separated string format required by OAuth.
 * Filters out invalid scopes and removes duplicates.
 *
 * @param scopes - Array of scope strings
 * @returns Space-separated scope string
 *
 * @example
 * buildScopeString([CHARACTER_SCOPES.WALLET, CHARACTER_SCOPES.ASSETS])
 * // Returns: "esi-wallet.read_character_wallet.v1 esi-assets.read_assets.v1"
 */
export function buildScopeString(scopes: readonly string[] | string[]): string {
  // Remove duplicates and invalid scopes
  const validScopes = [...new Set(scopes)].filter(isValidScope);
  return validScopes.join(' ');
}

/**
 * Parse scope string from JWT token
 *
 * Extracts scopes from JWT token scp claim (array or space-separated string).
 *
 * @param scp - Scopes from JWT token
 * @returns Array of scope strings
 *
 * @example
 * parseTokenScopes("publicData esi-assets.read_assets.v1")
 * // Returns: ["publicData", "esi-assets.read_assets.v1"]
 */
export function parseTokenScopes(scp: string | string[]): string[] {
  if (Array.isArray(scp)) {
    return scp;
  }
  if (typeof scp === 'string') {
    return scp.split(' ').filter(s => s.length > 0);
  }
  return [];
}

/**
 * Check if token has required scopes
 *
 * Verifies that a JWT token contains all required scopes.
 * Useful for authorization checks in API endpoints.
 *
 * @param tokenScopes - Scopes from JWT token (scp claim)
 * @param requiredScopes - Scopes required for operation
 * @returns True if token has all required scopes
 *
 * @example
 * hasRequiredScopes(["publicData", "esi-assets.read_assets.v1"], [CHARACTER_SCOPES.ASSETS])
 * // Returns: true
 */
export function hasRequiredScopes(tokenScopes: string | string[], requiredScopes: string[]): boolean {
  const scopes = parseTokenScopes(tokenScopes);
  return requiredScopes.every(required => scopes.includes(required));
}
