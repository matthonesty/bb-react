/**
 * @fileoverview SRP Request Validator
 *
 * Validates SRP requests by checking killmails against O'Bomber-care rules.
 */

const { parseKillmailFromText } = require('../killmail/parser');
const { isApprovedShip, getPayoutAmount, getShipInfo } = require('./shipTypes');

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether request is valid
 * @property {string[]} errors - Array of validation error messages
 * @property {string[]} warnings - Array of validation warnings
 * @property {Object} killmail_data - Parsed killmail data
 * @property {Object} ship_info - Ship information
 * @property {number} payout_amount - Calculated payout amount
 * @property {boolean} requires_fc_approval - True if FC discretion needed
 */

/**
 * Validate SRP request from EVE mail
 *
 * Supports two killmail formats:
 * 1. EVE in-game kill link: <url=killReport:ID:HASH>Kill: Character (Ship)</url>
 * 2. Zkillboard URL: https://zkillboard.com/kill/ID/
 *
 * @param {string} mailBody - Body of EVE mail containing killmail link
 * @param {Object} approvedShipsMap - Pre-loaded approved ships map from getAllApprovedShips()
 * @returns {Promise<ValidationResult>} Validation result
 *
 * @example
 * const ships = await getAllApprovedShips();
 * const result = await validateSRPRequest(mailBody, ships);
 * if (result.valid) {
 *   console.log(`Approved for ${result.payout_amount} ISK`);
 * } else {
 *   console.log(`Denied: ${result.errors.join(', ')}`);
 * }
 */
async function validateSRPRequest(mailBody, approvedShipsMap) {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    killmail_data: null,
    ship_info: null,
    payout_amount: 0,
    requires_fc_approval: false
  };

  try {
    // Parse killmail from text
    let killmailResult;
    try {
      killmailResult = await parseKillmailFromText(mailBody);
    } catch (error) {
      result.errors.push(`Failed to parse killmail: ${error.message}`);
      return result;
    }

    result.killmail_data = killmailResult.parsed;

    // Check if ship type is approved
    const shipTypeId = killmailResult.parsed.victim_ship_type_id;
    if (!isApprovedShip(shipTypeId, approvedShipsMap)) {
      result.errors.push(`Ship type ${shipTypeId} is not approved for O'Bomber-care`);
      return result;
    }

    // Get ship info and payout
    const shipInfo = getShipInfo(shipTypeId, approvedShipsMap);
    result.ship_info = shipInfo;

    // Calculate payout amount
    let payoutAmount = getPayoutAmount(shipTypeId, approvedShipsMap, killmailResult.is_polarized);
    result.payout_amount = payoutAmount;

    // Check if FC discretion required
    if (shipInfo.fc_discretion) {
      result.requires_fc_approval = true;
      result.warnings.push('This ship type requires FC discretion for approval');
    }

    // Warn if polarized
    if (killmailResult.is_polarized) {
      result.is_polarized = true;
      result.warnings.push('Polarized fit detected - higher payout applied');

      // Add specific warning if incomplete polarized fit
      if (killmailResult.polarized_warning) {
        result.warnings.push(killmailResult.polarized_warning);
      }
    }

    // All checks passed
    result.valid = true;

  } catch (error) {
    result.errors.push(`Unexpected validation error: ${error.message}`);
  }

  return result;
}

module.exports = {
  validateSRPRequest
};
