---
title: Turnstile Bot Protection for Passwordless Login
domain: Checkout
status: active
version: 4
created: 2026-04-08
last_updated: 2026-04-27
author: Avinash Kumar
changelog:
  - version: 4.0
    date: 2026-04-27
    change: >
      WI-6: Skip redundant Turnstile challenge during registration if shopper already completed challenge during login
      with server-side verification cookie (cc-tv), early widget mount on focus, executeRef prop
    author: Avinash Kumar
  - version: 3.0
    date: 2026-04-23
    change: >
      WI-5: Login page enforcement, token reset after use, fail-closed config,
      locale fix, shared enforcement utility, updated config examples
    author: Avinash Kumar
  - version: 2.2
    date: 2026-04-20
    change: "Add Turnstile-WI-4: Protect checkout registration endpoint from bot abuse"
    author: Avinash Kumar
  - version: 2.1
    date: 2026-04-20
    change: Managed mode default, deferred widget render, gated form submission, attack logging
    author: Avinash Kumar
  - version: 2.0
    date: 2026-04-20
    change: Add Turnstile-WI-2 - Server-side token verification on MRT (4 work items)
    author: Avinash Kumar
  - version: 1.2
    date: 2026-04-09
    change: Ready - cleaned up code, updated spec
    author: Avinash Kumar
  - version: 1.1
    date: 2026-04-09
    change: Complete E2E coverage - 6 tests covering all Cloudflare test key scenarios
    author: Avinash Kumar
  - version: 1.0
    date: 2026-04-08
    change: Initial spec for Turnstile bot protection
    author: Avinash Kumar
---

# Turnstile Bot Protection for Passwordless Login

## Overview

Protect all passwordless login and registration endpoints from bot abuse using Cloudflare Turnstile. Default mode is **managed**: Cloudflare decides whether to show an interactive challenge or auto-pass based on risk signals. All server-side enforcement uses a shared utility (`enforceTurnstile`) with fail-closed defaults — if no Turnstile site keys are configured, protected endpoints reject requests.

## Implementation Status

**Frontend:** Ready (2026-04-27)
- Turnstile widget integrated in checkout contact info, checkout registration, and login page
- Contact info: widget mounts on email focus (deferred execution), challenge triggered on blur
- TurnstileWidget should be below the email text field on UI
- Registration: widget skipped if shopper already verified at contact info (sessionStorage flag)
- Token included in all passwordless login and registration requests
- Token consumption tracked via ref to avoid double-verify bug
- Graceful error handling (fails silently on client misconfiguration)
- 9 E2E tests covering client + server scenarios

**Backend:** Ready (2026-04-27)
- Shared server-side enforcement via `turnstile-enforce.server.ts`
- Three protected endpoints: authorize-passwordless-email, initiate-checkout-registration, login page action
- Server-side verification cookie (`cc-tv`, httpOnly, 30min TTL) set on successful turnstile at contact info
- Registration endpoint accepts either a fresh token OR the `cc-tv` cookie as proof of prior verification
- Missing Origin/Referer header detection with diagnostic logging
- Fail-closed config: no site keys configured → requests blocked
- No token and no cookie → 403 (prevents scripted abuse without browser)

## Acceptance Criteria

### Turnstile-WI-1: Bot Protection (Frontend) [done]

**Completed:**
- [x] Turnstile script loads from Cloudflare CDN
- [x] Widget renders in checkout after email blur (deferred, not on page load)
- [x] Default mode is `managed` (Cloudflare decides challenge type)
- [x] Token generated and included in passwordless login requests
- [x] Configurable via MRT config (`security.turnstile.sites`)
- [x] Form submission gated: Continue button disabled until challenge solved
- [x] Passwordless login deferred until token is available (both modes)
- [x] Graceful degradation on misconfiguration (fails open for shopper on client side)

### Turnstile-WI-2: Server-Side Token Verification on MRT [done]

**Completed:**

#### Turnstile-WI-2a: Server-side verification utility [done]
- [x] Create `src/lib/turnstile-verify.server.ts`
- [x] Call Cloudflare siteverify API (`POST https://challenges.cloudflare.com/turnstile/v0/siteverify`)
- [x] Pass `secret` (from env) and `response` (token from client)
- [x] Optionally pass `remoteip` for additional validation
- [x] Handle timeouts (5s max), network errors, malformed responses
- [x] Return typed result: `{ success: boolean; errorCodes?: string[]; challengeTs?: string }`
- [x] Unit tests with mocked fetch (9 tests, vitest)

#### Turnstile-WI-2b: Integration into server actions [done]
- [x] Wire `verifyTurnstileToken()` into `action.authorize-passwordless-email.ts`
- [x] Extract `turnstileToken` from FormData (already sent by frontend)
- [x] Reject requests with no token (blocks bots bypassing widget)
- [x] Verify token BEFORE calling `authorizePasswordless()`
- [x] Return 403 with error message if verification fails
- [x] Graceful fallback: if `verification.enabled = false`, skip check

#### Turnstile-WI-2c: Configuration and secret key management [done]
- [x] Add `verification` section to turnstile config type
- [x] Read secret keys from `TURNSTILE_SECRET_KEYS` env var (server-only, JSON map)
- [x] Look up secret key by site key: `{ "siteKey1": "secretKey1" }`
- [x] Update `config.server.ts` with `verification.enabled` default
- [x] Document deployment: set `TURNSTILE_SECRET_KEYS` in MRT Runtime Admin

#### Turnstile-WI-2d: E2E validation with Cloudflare test keys [done]
- [x] Verify with always-pass secret: `1x0000000000000000000000000000000AA`
- [x] Verify with always-fail secret: `2x0000000000000000000000000000000AA`
- [x] Verify token-already-spent: `3x0000000000000000000000000000000AA`
- [x] Test enforcement mode: invalid token → 403 response
- [x] Interactive challenge blocks form submission until solved

### Turnstile-WI-3: Attack Detection Logging [done]

- [x] Log missing token with IP, user-agent, email (bot bypass attempt)
- [x] Log verification failure with error codes, IP, user-agent (replay/invalid token)
- [x] Log merchant misconfiguration (missing secret key) without blocking shopper
- [x] All warn-level logs include `action` field for filtering in MRT logs

### Turnstile-WI-4: Protect Checkout Registration Endpoint [done]

The `/action/initiate-checkout-registration` endpoint triggers OTP emails for guest users who opt to "save info for faster checkout next time." Without Turnstile protection, an attacker can script POST requests to this endpoint to trigger mass OTP emails (email bombing) or enumerate registered accounts.

- [x] Add TurnstileWidget to `register-customer-selection.tsx` (rendered below checkbox)
- [x] Include `turnstileToken` in registration form submission and resend code flow
- [x] Add server-side Turnstile verification to `action.initiate-checkout-registration.ts`
- [x] Reject requests with no token AND no `cc-tv` verification cookie (see WI-6c)
- [x] Add `POST` method check to the action
- [x] Attack logging: missing token, failed verification, merchant misconfiguration (same pattern as WI-3)
- [x] Update existing tests with Turnstile mocks

### Turnstile-WI-5: Harden All Passwordless Flows [done]

Extend Turnstile enforcement to remaining passwordless flows, 
extract shared enforcement utility, 
remove test credentials from production config, and make sure no hardcoded locale.

#### WI-5a: Login page enforcement [done]
- [x] Add `enforceTurnstile()` to login page server action (`_empty.login.tsx`) passwordless branch
- [x] Add TurnstileWidget to login page OTP resend flow
- [x] Include `turnstileToken` in login resend FormData
- [x] Reset token after each resend (single-use tokens)

#### WI-5b: Shared enforcement utility [done]
- [x] Create `turnstile-enforce.server.ts` — single entry point for all server-side enforcement
- [x] All three protected endpoints use `enforceTurnstile()` (no duplicated verification logic)
- [x] Centralized logging: missing Origin/Referer, no site key, no secret key, missing token, verification failure
- [x] Unit tests: 10 tests covering all enforcement paths

#### WI-5c: Token reset after use [done]
- [x] Turnstile tokens are single-use (Cloudflare invalidates after first verification)
- [x] `register-customer-selection.tsx`: reset token via `resetRef` after checkbox submission and resend
- [x] `_empty.login.tsx`: reset token after OTP resend
- [x] `contact-info.tsx`: token consumption tracked via `tokenConsumedRef`; reset on email change triggers fresh challenge (see WI-6a)

#### WI-5d: Fail-closed configuration [done]
- [x] Remove Cloudflare test key (`1x00000000000000000000BB`) from `config.server.ts`
- [x] Default `sites` to `{}` when env var is missing (fail-closed — no sites → all requests blocked)
- [x] Add try/catch for `JSON.parse` of `PUBLIC__security__turnstile__sites` (malformed JSON → `{}`)
- [x] Move local-dev test key to `.env.default` where it belongs
- [x] `enforceTurnstile()` early-returns `false` when Origin/Referer headers are missing (with diagnostic log)

#### WI-5e: Locale fix [done]
- [x] Replace hardcoded `locale: 'en-US'` in `action.initiate-checkout-registration.ts` with dynamic locale from `i18nextContext`
- [x] Update test mock context to provide locale via `context.get(i18nextContext)`

### Turnstile-WI-6: Deferred Execution & Session-Level Verification [done]

Eliminate redundant registration challenge and harden server-side enforcement.

#### WI-6a: Deferred execution to fix double-click [done]
- [x] Change contact info widget from `execution: 'render'` to `execution: 'execute'` (non-interactive mode)
- [x] Mount widget on email focus (gives Cloudflare time to gather browser signals)
- [x] Explicitly call `turnstile.execute()` on email blur
- [x] Add `executeRef` prop to `TurnstileWidget` component for parent-controlled execution
- [x] Track token consumption via `tokenConsumedRef` to avoid resetting prematurely

#### WI-6b: Skip redundant registration challenge [done]
- [x] Set `sessionStorage('turnstileVerified', '1')` on successful contact info challenge (client-side UX optimization)
- [x] Registration component checks `sessionStorage` — skips widget render if already verified
- [x] TurnstileWidget should be below the checkbox in registration UI
- [x] Create `turnstile-constants.ts` with `COOKIE_TURNSTILE_VERIFIED` (`cc-tv`) and `TURNSTILE_VERIFIED_MAX_AGE` (30min)
- [x] `action.authorize-passwordless-email.ts`: set `cc-tv` httpOnly cookie on successful turnstile verification
- [x] `action.initiate-checkout-registration.ts`: accept `cc-tv` cookie as proof of prior verification
- [x] No token AND no cookie → 403 (blocks scripted abuse without a browser)
- [x] Fresh token still accepted if provided (fallback for expired cookie or direct access)

**Cloudflare Siteverify API:**
```
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
Content-Type: application/x-www-form-urlencoded

secret=<SECRET_KEY>&response=<TOKEN>&remoteip=<IP>
```

**Response:**
```json
{
  "success": true|false,
  "challenge_ts": "2026-04-20T12:00:00.000Z",
  "hostname": "store.example.com",
  "error-codes": [],
  "action": "",
  "cdata": ""
}
```

**Test Secret Keys (Cloudflare-provided):**
| Secret Key | Behavior |
|-----------|----------|
| `1x0000000000000000000000000000000AA` | Always passes |
| `2x0000000000000000000000000000000AA` | Always fails |
| `3x0000000000000000000000000000000AA` | Yields token-already-spent error |

Source: [Cloudflare Turnstile Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

**Configuration:**
- Mode: `managed` (default). Cloudflare decides whether to show an interactive challenge.
- Token: Short-lived, single-use, passed as `turnstileToken` field
- Server enforcement: Requires token, rejects missing/invalid tokens
- Fail-closed: No configured sites → requests blocked

## User Experience

**Normal Flow (checkout contact info):**
1. User focuses email field → widget mounts in deferred mode (Cloudflare gathers browser signals)
2. User types email and blurs → challenge executed (auto-solves or shows interactive widget)
3. Token generated, passwordless login fires automatically
4. Continue button becomes enabled
5. Server-side `cc-tv` cookie set on success

**Normal Flow (checkout registration):**
1. User checks "Save for faster checkout" checkbox
2. If `cc-tv` cookie exists (verified at contact info) → no widget shown, request proceeds
3. If cookie missing/expired → widget renders, Cloudflare evaluates, token sent with request

**Email Change (re-verification):**
1. User changes email after initial verification
2. Old token marked as consumed, widget resets
3. Fresh challenge triggered, new token generated before submission

**Error Flow (merchant misconfiguration):**
1. No secret key configured for site
2. Warning logged on server
3. Request blocked (fail-closed — `enforceTurnstile` returns `false`)

**Attack Blocked:**
1. Bot sends request without token and without `cc-tv` cookie → 403 rejected, logged
2. Bot sends invalid/replayed token → 403 rejected, logged
3. Bot sends request without Origin/Referer → blocked, diagnostic log
4. Script hits registration endpoint directly (no browser session) → no cookie, no token → 403

## Implementation

**Components:**
- `turnstile-enforce.server.ts` — Shared server-side enforcement utility (used by all three protected endpoints)
- `turnstile-verify.server.ts` — Cloudflare siteverify API call
- `turnstile-utils.ts` — Site key lookup, mode, and config helpers
- `turnstile-constants.ts` — Cookie name (`cc-tv`) and TTL constants
- `TurnstileWidget` — Loads Cloudflare script, renders widget, manages token lifecycle, exposes `resetRef` and `executeRef`
- `contact-info.tsx` — Checkout email: widget mounts on focus (deferred execution), challenge on blur, sets `cc-tv` cookie via server
- `register-customer-selection.tsx` — Checkout registration: skips widget if `sessionStorage` flag set, renders below checkbox otherwise
- `_empty.login.tsx` — Login page: server-side enforcement + widget for OTP resend flow
- `action.authorize-passwordless-email.ts` — Server verification + sets `cc-tv` httpOnly cookie on success
- `action.initiate-checkout-registration.ts` — Accepts fresh token OR `cc-tv` cookie; rejects if neither present

**Configuration (`config.server.ts`):**
```typescript
security: {
  turnstile: {
    // Parsed from PUBLIC__security__turnstile__sites env var
    // Defaults to {} when env var is missing or malformed (fail-closed)
    sites: {},
    enabled: true,
    mode: 'managed',  // 'managed' | 'non-interactive' | 'invisible'
    verification: { enabled: true }
  }
}
```

**Local development (`.env.default`):**
```bash
# Cloudflare test key that always passes — for local dev only.
# Production sites must set their own site keys via MRT env vars.
PUBLIC__security__turnstile__sites={"local-dev":[{"siteKey":"1x00000000000000000000BB","domains":["localhost","127.0.0.1"]}]}
```

**Protected Endpoints:**
| Endpoint | Component | Enforcement |
|----------|-----------|-------------|
| `action.authorize-passwordless-email` | `contact-info.tsx` | Token required; sets `cc-tv` cookie on success |
| `action.initiate-checkout-registration` | `register-customer-selection.tsx` | Token OR `cc-tv` cookie required |
| `_empty.login.tsx` (server action) | `_empty.login.tsx` | Token required (login page) |

**Token Flow (contact info):**
1. Shopper focuses email field → widget mounts with `execution: 'execute'` (deferred)
2. Shopper blurs email → `turnstile.execute()` called, challenge runs
3. Token stored in React state, `tokenConsumedRef` set to false
4. Token included in passwordless email request
5. `enforceTurnstile()` verifies token, `authorizePasswordless()` sends OTP
6. Server sets `cc-tv` httpOnly cookie (30min TTL)
7. `tokenConsumedRef` set to true (prevents reuse without reset)
8. If email changes: `resetTurnstile()` called → effect calls `execute()` → fresh token generated

**Token Flow (registration):**
1. Shopper checks "Save for faster checkout" checkbox
2. Client checks `sessionStorage('turnstileVerified')` — if set, no widget rendered
3. Server checks `cc-tv` cookie — if present, request proceeds without token
4. If neither: widget renders, token generated, sent with request, verified server-side

**Request:**
```typescript
{
  email: string;
  turnstileToken: string  // Required when verification enabled
}
```

**Server Logging (attack detection):**
| Log Message | Level | Meaning |
|-------------|-------|---------|
| `[Turnstile] No Origin or Referer header` | warn | Cannot determine site key (check reverse-proxy config) |
| `[Turnstile] No site key match for request origin` | warn | Origin doesn't match any configured domain |
| `[Turnstile] No secret key configured for site` | warn | Site key found but no matching secret |
| `[Turnstile] Missing token` | warn | Bot bypassed client widget |
| `[Turnstile] Verification failed` | warn | Invalid/replayed token (potential bot or replay attack) |

All warn logs include: `remoteIp`, `userAgent`, `email`, `action`

## Testing

**Unit Tests:**
- `src/lib/turnstile-verify.server.test.ts` (9 tests)
- `src/lib/turnstile-enforce.server.test.ts` (10 tests)
- `src/lib/turnstile-utils.test.ts` (18 tests)
- `src/routes/action.authorize-passwordless-email.test.ts` (Turnstile mocks)
- `src/routes/action.initiate-checkout-registration.test.ts` (Turnstile mocks)

**E2E Tests:** `e2e/src/specs/core/checkout-turnstile.spec.ts`

**Client-side tests (Turnstile-WI-1):**
| Test | Key | Validates |
|------|-----|-----------|
| Script loading | `1x00000000000000000000BB` | CDN load, API, widget DOM |
| Token generation | `1x00000000000000000000BB` | Token in request |
| Graceful degradation | `1x00000000000000000000BB` | Form works, no errors |
| Error handling | `2x00000000000000000000BB` | Challenge fails, form works |
| Managed mode | `1x00000000000000000000AA` | Widget container exists |
| Interactive challenge | `3x00000000000000000000FF` | Widget container exists |

**Server-side tests (Turnstile-WI-2):**
| Test | Secret Key | Validates |
|------|-----------|-----------|
| Valid token (always-pass) | `1x0000000000000000000000000000000AA` | Request passes verification |
| Invalid token (always-fails) | `2x0000000000000000000000000000000AA` | Request rejected with 403 |
| Token already spent | `3x0000000000000000000000000000000AA` | Replay attack blocked |
| Interactive challenge blocks | `3x00000000000000000000FF` | Form blocked until solved |

**Run:**
```bash
pnpm e2e --grep "@turnstile"           # All turnstile tests
pnpm e2e --grep "@checkout-ac31"       # Server verification only
pnpm e2e --grep "@blocks-submission"   # Interactive challenge gating
```

**Test Site Keys (client):**
- `1x00000000000000000000BB` - Non-interactive, always passes
- `2x00000000000000000000BB` - Non-interactive, always fails
- `1x00000000000000000000AA` - Managed, always passes
- `3x00000000000000000000FF` - Managed, forces interactive challenge

**Test Secret Keys (server):**
- `1x0000000000000000000000000000000AA` - Always passes
- `2x0000000000000000000000000000000AA` - Always fails
- `3x0000000000000000000000000000000AA` - Token already spent

Source: [Cloudflare Turnstile Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## Configuration

**MRT Config** (`config.server.ts`):
```typescript
security: {
  turnstile: {
    // Default: {} (fail-closed — no sites configured means all requests blocked)
    // Override via PUBLIC__security__turnstile__sites env var
    sites: {},
    enabled: true,
    mode: 'managed',  // 'managed' | 'non-interactive' | 'invisible'
    verification: { enabled: true }
  }
}
```

**Environment Variables:**
```bash
# Client-side (PUBLIC__ prefix, exposed to browser)
PUBLIC__security__turnstile__enabled=true
PUBLIC__security__turnstile__mode=managed
PUBLIC__security__turnstile__sites='{"prod":[{"siteKey":"YOUR_KEY","domains":["your-store.com"]}]}'

# Server-side (no PUBLIC__ prefix, never exposed to browser)
TURNSTILE_VERIFICATION_ENABLED=true
TURNSTILE_SECRET_KEYS={"YOUR_SITE_KEY":"YOUR_SECRET_KEY"}

# Local development only (.env.default provides this automatically)
PUBLIC__security__turnstile__sites={"local-dev":[{"siteKey":"1x00000000000000000000BB","domains":["localhost","127.0.0.1"]}]}
```

## Production Deployment

1. **Get production site key + secret key** from Cloudflare Dashboard
2. **Set client config** in MRT Runtime Admin: `PUBLIC__security__turnstile__sites` with your production domains
3. **Set server secrets** in MRT Runtime Admin: `TURNSTILE_SECRET_KEYS` and `TURNSTILE_VERIFICATION_ENABLED=true`
4. **Do NOT hardcode test keys** in `config.server.ts` — the default is `{}` (fail-closed). Test keys belong only in `.env.default` for local development.
5. **Deploy** — Frontend widget and server verification active immediately on all three endpoints
6. **Monitor** — Watch MRT logs for `[Turnstile]` warn entries to detect attacks and misconfigurations

## Documentation

- **Feature Spec:** `e2e/feature-specs/checkout/turnstile-protection.spec.md`
- **Test Plan:** `e2e/test-plans/turnstile-test-plan.md`
- **E2E Tests:** `e2e/src/specs/core/checkout-turnstile.spec.ts`

## References

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Test Keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [SCAPI Passwordless Login](https://developer.salesforce.com/docs/commerce/commerce-api/)
