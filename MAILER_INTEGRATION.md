# Mailer Integration Guide

## Overview

The Bombers Bar SRP system includes automated mail processing that:

1. Monitors EVE in-game mail for SRP submissions
2. Validates killmail links from zkillboard
3. Auto-creates SRP requests in the database
4. Sends rejection/confirmation emails back to pilots
5. Reconciles wallet journal entries with SRP payments

## Architecture

### Components

1. **Mailer Service Account**
   - A dedicated EVE character that receives SRP submission mails
   - Configured with ESI scopes to read/send mail and access wallet
   - Credentials stored in environment variables

2. **Cron Job** (`/api/cron/process-mail`)
   - Runs every 15 minutes (configured in `vercel.json`)
   - Automatically processes new mails
   - Posts results to Discord webhook (optional)

3. **Admin Manual Trigger** (`/api/admin/mail`)
   - Allows admins to manually trigger mail processing
   - Useful for testing or immediate processing

4. **Processing Library** (`/lib/mail/processMailsForSRP.js`)
   - Shared logic for mail validation and SRP creation
   - Handles auto-rejections (too old, unapproved ship, sender mismatch, multiple killmails)
   - Enriches killmails with proximity data and FC information

5. **Mail Queue** (`/lib/mail/sendQueuedMails.js`)
   - Rate-limited outgoing mail queue
   - Prevents ESI rate limit violations
   - Retries failed mails

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# Mailer Service Account
MAILER_CHARACTER_ID=your_character_id
MAILER_CLIENT_ID=your_client_id
MAILER_SECRET_KEY=your_secret_key

# Optional: Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Note**: `MAILER_REFRESH_TOKEN` is NOT stored in environment variables. It's obtained dynamically when the admin authorizes the mailer service account via `/api/auth/mailer-login` and stored in the database (`admin_tokens` table). The system automatically rotates this token on each refresh.

### 2. Authorize Mailer Service Account

1. Log in to EVE Online with your mailer service account
2. Navigate to `/api/auth/mailer-login`
3. Authorize with required scopes:
   - `esi-mail.read_mail.v1`
   - `esi-mail.send_mail.v1`
   - `esi-wallet.read_corporation_wallets.v1`
   - `esi-universe.read_structures.v1`

### 3. Optional: Configure Discord Webhook

If you want Discord notifications for cron results, add `DISCORD_WEBHOOK_URL` to your Vercel environment variables.

### 4. Deploy to Vercel

The cron job is automatically configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-mail",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This runs every 15 minutes. Adjust as needed.

**Note**: Vercel Cron natively secures cron endpoints - no additional authentication is needed.

## How It Works

### Mail Processing Flow

1. **Fetch Mail Headers**
   - Cron job fetches recent mail headers from ESI
   - Filters out already-processed mails (tracked in `processed_mails` table)

2. **Validate Submissions**
   - Extracts zkillboard/ESI killmail links from mail body
   - Validates killmail data (ship type, age, pilot)
   - Checks ban list
   - Fetches proximity data (nearby kills, FC presence)

3. **Auto-Rejections**
   - **Unapproved Ship**: Ship type not in approved list
   - **Too Old**: Killmail > 30 days old
   - **Sender Mismatch**: Submitter ≠ victim character
   - **Multiple Killmails**: More than one killmail link in mail

4. **SRP Creation**
   - Valid submissions create entries in `srp_requests` table
   - Status set to `pending` for admin review
   - Proximity data stored for FC verification

5. **Notifications**
   - Rejection emails queued for auto-rejected submissions
   - Confirmation emails queued for valid submissions
   - Discord webhook notified of cron results

6. **Wallet Reconciliation**
   - Fetches recent wallet journal entries
   - Matches payments to approved SRP requests
   - Auto-marks requests as `paid` when payment detected

## Manual Testing

### Test Cron Job Locally

```bash
curl http://localhost:3000/api/cron/process-mail
```

### Test Admin Trigger

```bash
# Must be logged in as admin
curl http://localhost:3000/api/admin/mail?processMails=true
```

### Check Queue Status

The mail queue is stored in the `pending_mails` table. You can check it with:

```sql
SELECT * FROM pending_mails WHERE sent = false ORDER BY retry_after;
```

## Monitoring

### Discord Notifications

If `DISCORD_WEBHOOK_URL` is configured, the cron job posts:

- **Mail Processing Stats**: Processed, created, skipped counts
- **Wallet Reconciliation**: Journal entries saved, payments reconciled
- **ESI Health**: Status and warnings
- **Errors**: Up to 3 error messages with details
- **Performance**: Total processing duration

### Logs

All mail processing is logged to console with `[MAIL CRON]` prefix:

```
[MAIL CRON] Starting automated mail processing...
[MAIL CRON] Checking ESI health status...
[MAIL CRON] Mailer access token obtained
[MAIL CRON] Found 25 total mails
[MAIL PROCESSING] Processing 5 unprocessed mails
[MAIL PROCESSING] Mail 12345: Valid SRP - Purifier - 50,000,000 ISK
[MAIL CRON] Processing complete: {...}
```

## Database Schema

### `processed_mails`

Tracks all processed mails to avoid duplicates:

```sql
- mail_id (primary key)
- from_character_id
- sender_name
- status (srp_created, rejected_ship, rejected_too_old, etc.)
- error_message
- killmail_data (JSONB)
- proximity_data (JSONB)
- srp_request_id (links to srp_requests)
```

### `srp_requests`

Main SRP request table:

```sql
- id (primary key)
- character_id
- killmail_id
- status (pending, approved, denied, paid)
- denial_reason
- proximity_data (JSONB) - NEW
- ... (other fields)
```

### `pending_mails`

Outgoing mail queue:

```sql
- id (primary key)
- mail_type (rejection, confirmation)
- payload (JSONB)
- sent (boolean)
- retry_after (timestamp)
```

## Troubleshooting

### Mailer Token Expired

**Error**: `No mailer token available`

**Solution**: Re-authorize the mailer service account at `/api/auth/mailer-login`

### ESI Rate Limits

**Error**: `ESI rate limit exceeded`

**Solution**: The mail queue automatically handles rate limits. Wait 60 seconds and the cron will retry.

### ESI Unhealthy

**Error**: `ESI is currently unhealthy`

**Solution**: The cron job automatically skips processing when ESI is down. It will resume when ESI recovers.

### Duplicate SRP Requests

**Error**: Pilots complaining about duplicate requests

**Solution**: Check `processed_mails` table for the mail_id. If it's not there, the mail wasn't tracked properly. This should be rare.

### No Discord Notifications

**Check**: Is `DISCORD_WEBHOOK_URL` set in environment variables?

**Check**: Is there actual activity to report? (The system only posts when there's something to say)

## Development

### Running Mailer Locally

The mailer code is in `/lib/mail/` and can be tested locally:

```bash
npm run dev
# Visit http://localhost:3000/api/cron/process-mail
```

### Debugging

Enable verbose logging by checking console output with `[MAIL CRON]` prefix.

### Testing Auto-Rejections

Send test mails to the mailer character with:

- Invalid ship types (not in approved list)
- Old killmails (>30 days)
- Wrong sender (different character than victim)
- Multiple killmail links

## Migration Notes

All mailer code has been migrated from the old `/bb/` project to `/bb-react/`:

- ✅ Processing logic (`processMailsForSRP.js`)
- ✅ Mail queue (`sendQueuedMails.js`)
- ✅ ESI integration (`/lib/esi/`)
- ✅ Killmail parsing with proximity data (`/lib/killmail/`)
- ✅ SRP validation (`/lib/srp/`)
- ✅ API endpoints (Next.js App Router format)
- ✅ Cron configuration (`vercel.json`)
- ✅ Environment variables documented

The system is fully integrated and ready to use!
