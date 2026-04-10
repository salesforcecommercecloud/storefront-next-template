---
title: Turnstile Bot Protection for Passwordless Login
domain: Checkout
status: active
version: 1.2
created: 2026-04-08
last_updated: 2026-04-09
author: Avinash Kumar
changelog:
  - version: 1.2
    date: 2026-04-09
    change: Production ready - cleaned up code, updated spec
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

Protect passwordless login endpoints from bot abuse using Cloudflare Turnstile. Provides invisible bot protection without user friction - challenges run in the background and only appear when necessary.

## Implementation Status

**Frontend:** Production ready (2026-04-09)
- Turnstile widget integrated in checkout (invisible mode)
- Token included in passwordless login requests  
- Graceful error handling (fails silently)
- 6 E2E tests covering all scenarios (100% pass rate)

**Backend:** Pending eCDN token verification

## Acceptance Criteria

### AC30: Turnstile Bot Protection

**Completed:**
- [x] Turnstile script loads from Cloudflare CDN
- [x] Widget renders in checkout (invisible mode)
- [x] Token generated and included in passwordless login requests
- [x] Configurable via MRT config (`security.turnstile.siteKeys`)
- [x] Graceful degradation (fails silently, form continues to work)

**Pending:**
- [ ] Backend token verification via eCDN

**Configuration:**
- Mode: Invisible (no UI unless challenge required)
- Token: Short-lived, passed as `turnstileToken` field
- Error handling: Console warnings only, no user-facing errors

## User Experience

**Normal Flow:**
1. User enters email in checkout
2. Turnstile validates in background (invisible)
3. Token generated automatically
4. Passwordless login proceeds with token

**Challenge Flow:**
1. Turnstile detects suspicious activity
2. Interactive challenge shown (rare)
3. User completes challenge
4. Passwordless login proceeds

**Error Flow:**
1. Turnstile fails to load
2. Warning logged to console
3. Form works without bot protection
4. Passwordless login proceeds without token

## Implementation

**Components:**
- `TurnstileWidget` - Loads Cloudflare script, renders widget, manages token lifecycle
- `turnstile-utils.ts` - Site key lookup and config helpers
- `contact-info.tsx` - Integrates widget in checkout

**Configuration:**
```typescript
security: {
  turnstile: {
    siteKeys: { 'http://localhost:5173': '1x00000000000000000000BB' },
    enabled: true,
    mode: 'invisible'
  }
}
```

**Location:**
- Checkout: `contact-info.tsx` (active)
- Login page: Available but not currently used

**Token Flow:**
1. Widget renders on checkout load
2. Challenge runs automatically (invisible)
3. Token stored in React state
4. Token included in passwordless login request body

**Request:**
```typescript
{
  email: string;
  turnstileToken?: string  // Present if Turnstile succeeds
}
```

## Testing

**E2E Tests:** `e2e/src/specs/core/checkout-turnstile.spec.ts`

6 automated tests covering all Cloudflare test keys:

| Test | Key | Validates |
|------|-----|-----------|
| Script loading | `1x00000000000000000000BB` | CDN load, API, widget DOM |
| Token generation | `1x00000000000000000000BB` | Token in request |
| Graceful degradation | `1x00000000000000000000BB` | Form works, no errors |
| Error handling | `2x00000000000000000000BB` | Challenge fails, form works |
| Visible mode | `1x00000000000000000000AA` | Widget container exists |
| Interactive challenge | `3x00000000000000000000FF` | Widget container exists |

**Run:**
```bash
pnpm e2e --grep "@turnstile"
# Expected: 6 passed in ~23s
```

**Test Keys:**
- `1x00000000000000000000BB` - Invisible, always passes (default)
- `2x00000000000000000000BB` - Invisible, always fails
- `1x00000000000000000000AA` - Visible, always passes
- `3x00000000000000000000FF` - Visible, forces challenge

Source: [Cloudflare Turnstile Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## Configuration

**MRT Config** (`config.server.ts`):
```typescript
app: {
  security: {
    turnstile: {
      siteKeys: {
        'https://your-store.com': 'YOUR_PRODUCTION_KEY',
        'http://localhost:5173': '1x00000000000000000000BB'  // Test key
      },
      enabled: true,
      mode: 'invisible'
    }
  }
}
```

**Environment Variables:**
```bash
PUBLIC__security__turnstile__enabled=true
PUBLIC__security__turnstile__mode=invisible
PUBLIC__security__turnstile__siteKeys='{"https://your-store.com":"YOUR_KEY"}'
```

## Production Deployment

1. **Get production site key** from Cloudflare Dashboard
2. **Update `config.server.ts`** with production key
3. **Deploy frontend** - Turnstile will work immediately
4. **Deploy eCDN** - Token verification (separate deployment)

Until eCDN is deployed, tokens are sent but not verified.

## Documentation

- **Feature Spec:** `e2e/feature-specs/checkout/turnstile-protection.spec.md`
- **Test Plan:** `e2e/test-plans/turnstile-test-plan.md`
- **E2E Tests:** `e2e/src/specs/core/checkout-turnstile.spec.ts`

## References

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Test Keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [SCAPI Passwordless Login](https://developer.salesforce.com/docs/commerce/commerce-api/)
