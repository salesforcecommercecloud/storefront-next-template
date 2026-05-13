# Checkout: Payment Integration Framework

## Context

Merchants use different payment service providers (PSPs) depending on geography, business requirements, and payment method mix. The checkout framework must:

1. Allow merchants to plug in any PSP without forking or modifying core checkout code
2. Support all payment interaction patterns through a single set of framework contracts
3. Handle the complexity of multi-step flows (redirects, 3DS challenges, async settlement) transparently
4. Protect against failure scenarios (orphaned charges, double submissions, expired sessions)
5. Ship as part of the storefront template's extension system so customers can enable/disable payment integrations via configuration

A Stripe integration was used internally to validate the architecture end-to-end (Payment Element rendering, 3DS, server-side verification, instrument creation, order placement). Each ISV (including SF Payments) owns their own extension and orchestration decisions.

## Payment Scenarios

All payment interactions reduce to three orchestration patterns:

**INLINE:** The payment completes on the checkout page itself. The user never leaves:
- Examples: Card (Stripe, Adyen, Braintree, CyberSource), saved payment methods, wallet tokens
- Flow: Client validates/tokenizes -> confirms -> passes token to server -> server verifies -> order created

**REDIRECT:** User leaves the page (goes to PayPal login, Klarna approval, iDEAL bank). React state is lost. Return is not guaranteed:
- Examples: iDEAL, Klarna, Afterpay, PayPal, Sofort
- Flow: Create order -> redirect to provider -> provider confirms via webhook (and optionally redirects back)
- Challenge: React state is lost on redirect; must serialize checkout state to a cookie. Webhook may arrive before return. Shopper may never return.

**DEFERRED:** Order is created with payment still pending. Confirmation arrives later via webhook:
- Examples: Bank transfer, crypto, SEPA direct debit
- Flow: Order created with "pending" payment status -> webhook fires later -> order status updated

## Design Principles

1. **Provider-agnostic contracts:** The framework defines orchestration interfaces. Payment extensions implement provider-specific logic behind those interfaces.
2. **Extension-system native:** Payment integrations use the same extension system as all other checkout extensions (target-config.json, action hooks, extension routes, UITargets). No special registration mechanism.
3. **Cookie-based state for redirects:** No database available on MRT (serverless). HMAC-signed, short-lived httpOnly cookies store redirect state.
4. **Two payment timing patterns:** The framework supports both "authorize-before-order" and "order-before-payment." Extensions choose the pattern that fits their provider's payment lifecycle.
5. **Idempotency:** A unique key is generated on each checkout page mount, passed through cookies and form data, forwarded to providers to prevent double charges.
6. **ISV-owned orchestration:** Each payment ISV owns their extension's orchestration decisions. The framework provides the hooks and utilities; it does not prescribe which pattern to use or how to sequence operations.

---

# Part 1: Framework Design

## Payment Timing Patterns

The framework supports two patterns for when payment is attempted relative to order creation. The ISV chooses the pattern that fits their provider's payment lifecycle.

**Both patterns share the same six-step skeleton** - the framework runs the same client → server → hook sequence regardless. What differs is *what the extension actually does* at each step.

| Step | Both patterns | Authorize-Before-Order | Order-Before-Payment |
|---|---|---|---|
| 1. Shopper clicks Place Order | Framework invokes the extension's `onPaymentSubmit` callback | (Same) | (Same) |
| 2. Client `onPaymentSubmit` (extension) | Extension decides what to do, then calls `submitPlaceOrder(extraFormData)`. This is also where a multi-pattern extension picks the pattern for *this* submission and includes `framework_paymentFlowType` in `extraFormData` to send to server. | Confirms payment with provider SDK (3DS, biometric, etc.), obtains an authorization, then submits with the authorization handle (e.g., `paymentIntentId`) | Skips client-side confirmation entirely; submits with a payment-context handle (e.g., session ID, saved-instrument ID) - no authorization yet |
| 3. Client (framework) | POSTs the place-order form with whatever `extraFormData` the extension returned, plus `framework_paymentFlowType` (from `extraFormData` if the extension overrode it, else from the ref's mount-time default) | (Same) | (Same) |
| 4. Server `beforePlaceOrder` hook | Reads `framework_paymentFlowType` from formData and prepares the basket for order creation | Verifies the prior authorization with provider API, adds instrument to basket | Prepares the basket for charging - attaches a placeholder instrument (no auth yet) so SCAPI's `createOrder` accepts it |
| 5. Server: framework calls `createOrder` | Order is created from the basket | Order is created with the (already authorized) instrument | Order is created with `paymentStatus: 'not_paid'` |
| 6. Server `afterPlaceOrder` hook | Finalizes payment | **Captures** the authorized payment | **Attempts** payment via provider API; if it fails, fails/cancels the order |

The framework itself is pattern-agnostic - it just dispatches the same hooks in the same order. The extension differentiates the two patterns by what it does inside each hook (verify-then-capture vs. prepare-then-charge) and by the value of `framework_paymentFlowType` it sets, which lets server hooks branch their logic for capture vs. charge, void vs. cancel, etc. Extensions set a default `flowType` on `PaymentSubmissionRef` at mount time (the only value ever used by single-pattern extensions); multi-pattern extensions that support both patterns simultaneously (e.g., cards via authorize-before-order, iDEAL via order-before-payment) override it per submission via `extraFormData` in `onPaymentSubmit` as shown in step 2 of the table. The choice of which patterns an extension *supports* is a design decision; which one applies on a given submission is a runtime decision made by the extension's own logic.

### Trade-offs

| Consideration | Authorize-before-order | Order-before-payment |
|---------------|----------------------|---------------------|
| Basket expiry risk | Authorization may outlive the basket. Commerce Cloud's basket auto-expires; the auth lives in the PSP and auto-expires (typically 7 days for cards). The `onOrderFailure` hook lets the extension void immediately if order creation fails. | Not applicable - payment is never attached to a basket. |
| Failed payment recovery | Extension voids the auth via `onOrderFailure`; PSP auto-expiry is the fallback. | Order is failed/cancelled. Commerce Cloud's stuck-orders job detects and fails orders with `not_paid` status as a safety net. |
| Browser interaction | Supports client-side flows that need a UI step (3DS challenge, biometric prompt). | Supports server-to-server flows where no in-browser interaction is needed. |
| Orchestration complexity | Extension must handle client-side confirmation before the order is placed. | Extension must handle post-order payment failure (cancel the order, refund any partial captures). |

## Contracts

### Architecture

The framework runs the standard checkout flow and exposes interfaces (client-side callbacks + server-side hooks) that PSPs implement to plug in. Each PSP integration lives as a self-contained extension under `src/extensions/<provider-name>/`. Merchants enable/disable extensions via config.json; they don't modify the framework itself.

### Client-Side: PaymentSubmissionRef

The central coordination point between checkout and payment extensions. A mutable ref (not state or context) because:
- Both framework and extension read/write it (framework reads `flowType`, calls `onPaymentSubmit`; extension writes callbacks)
- Works across component boundaries without prop drilling

```typescript
interface PaymentSubmissionRefValue {
  formDataGetter: (() => PaymentData) | null;

  // Extension callbacks
  onPaymentSubmit: ((ctx: PaymentSubmitContext) => void | Promise<PaymentSubmitResult>) | null;
  onPaymentSuccess: (() => void) | null;
  onPaymentReturn: ((params: URLSearchParams) => Promise<PaymentReturnResult>) | null;

  // Non-null = extension active, built-in payment skipped.
  // The actual orchestration path is determined by what onPaymentSubmit does at runtime.
  flowType: PaymentFlowType | null;

  // Generated by framework on checkout mount. Extension forwards to provider to prevent double charges.
  idempotencyKey: string | null;

  // URL for providers to redirect back to. Set by extension on mount (e.g., '/action/stripe-redirect-return').
  // Available at render time so gateway SDKs can use it when mounting payment UI.
  returnUrl: string | null;

  options: { savePaymentToProfile?: boolean; useDifferentBilling?: boolean } | null;
  setFormErrors: ((errors: Record<string, { type: string; message: string }>) => void) | null;
}

type PaymentFlowType = 'inline' | 'redirect' | 'deferred';

interface PaymentSubmitContext {
  submitPlaceOrder: (extraFormData?: Record<string, string>) => void;
  basket: { basketId: string; orderTotal: number; currency: string };
}

type PaymentSubmitResult =
  | { status: 'ready'; extraFormData: Record<string, string> }
  | { status: 'redirect'; redirectUrl: string; stateToken: string; providerState?: string }
  | { status: 'error'; message: string; recoverable: boolean };

type PaymentReturnResult =
  | { status: 'success'; extraFormData: Record<string, string> }
  | { status: 'pending'; message: string }
  | { status: 'error'; message: string };
```

The framework only checks if `flowType` is non-null to know an extension is active. The actual flow path is decided per submission by `onPaymentSubmit`'s return value, which lets a single drop-in handle multiple payment methods without remounting.

**`PaymentSubmitContext`** is what the framework passes into `onPaymentSubmit` when the shopper clicks "Place order." It gives the extension everything it needs to talk to the provider and hand control back: `submitPlaceOrder(extraFormData)` to trigger the place-order submission with provider-specific fields, and `basket` (basketId, orderTotal, currency) for amount/currency-aware SDK calls.

In the place-order action, the framework treats `framework_paymentFlowType` as the "extension is active" flag (`formData.has('framework_paymentFlowType')`) - when present, it runs the extension's hooks; when absent, it falls back to the built-in payment flow. The framework also auto-appends `framework_idempotencyKey` to every submission - a unique-per-checkout-session identifier the extension forwards to the provider so retries don't double-charge. See [Idempotency](#idempotency) for the full lifecycle.

### Server-Side Hooks

Plain async functions invoked at specific lifecycle points during the place-order action. Not React hooks. The framework defines a fixed set of hook IDs (listed below); extensions register handlers against these IDs via `target-config.json` but cannot add new ones. Each hook ID has a predefined data contract (the typed `*HookData` interfaces), and extensions implement only the hooks they need - a pure inline-card extension might register just `beforePlaceOrder` and `afterPlaceOrder`, while a redirect-based one adds `onOrderFailure` and `onWebhook`. Hook implementations live in `src/extensions/<provider-name>/hooks/`.

**beforePlaceOrder** - Runs before `createOrder`. Extension adds payment instrument to basket, optionally verifies prior authorization.

```typescript
interface BeforePlaceOrderHookData {
  basket: Basket;
  formData: FormData;
}
```

**afterPlaceOrder** - Runs after `createOrder` succeeds. Extension captures authorized payment (authorize-before-order) or attempts the charge (order-before-payment). Also handles saving methods to the PSP for later reuse.

```typescript
interface AfterPlaceOrderHookData {
  order: Order;
  basket: Basket;
  formData: FormData;
}
```

**onOrderFailure** - Runs if `createOrder` fails after authorization (authorize-before-order only). Extension voids the auth. Best-effort: auth auto-expires as fallback.

```typescript
interface OrderFailureHookData {
  basket: Basket;
  formData: FormData;
  error: unknown;
}
```

**onWebhook** - Non-blocking. Extension processes async payment confirmation. Receives the **raw** request body and full headers map so the extension can verify the PSP's signature against the exact bytes it was computed over.

```typescript
interface PaymentWebhookHookData {
  providerName: string;       // demuxed from /action/payment-webhook?provider=<name>
  rawBody: string;            // exact bytes — verify signature against THIS, not parsed JSON
  headers: Record<string, string>; // lowercased keys
  signature: string;          // convenience pull-out of stripe-signature / x-signature
  orderNo: string;            // extension fills in after verification + payload parsing
  providerEventType: string;
  providerPayload: unknown;   // do NOT trust before verifying signature
}
```

Hook IDs registered in `src/targets/action-hook.server.ts`:
- `CHECKOUT_PAYMENTS_BEFORE_PLACE_ORDER`
- `CHECKOUT_PAYMENTS_AFTER_PLACE_ORDER`
- `CHECKOUT_PAYMENTS_ON_ORDER_FAILURE`
- `CHECKOUT_PAYMENTS_ON_WEBHOOK`
- `CHECKOUT_PAYMENTS_ON_EXPRESS_COMPLETE`

### Extension-Owned Routes

For redirect and webhook flows, extensions write their own routes rather than relying on framework hooks. Payment orchestration varies too much per provider (different return parameters, verification APIs, webhook formats) for a generic hook.

The framework provides importable utilities (`src/lib/payment-redirect.server.ts`) for common plumbing: HMAC-signed cookie serialization, timing-safe state token validation, cookie reading/clearing. Extensions import these and build routes with full control over orchestration.

Framework routes:
- `/action/payment-redirect-init` - Mints HMAC-signed redirect cookie (server-generated stateToken). Same-origin only; basketId must match the current shopper's basket; idempotencyKey must be UUID-shaped; providerState capped at 1KB. POST.
- `/action/payment-redirect-return` - Thin GET loader. Validates cookie + stateToken only — never mutates state. Renders an auto-submitting "Completing your payment" page that POSTs to the finalize action. Loaders re-run on prefetch / back-button navigation, so any mutation lives in the action below.
- `/action/payment-redirect-finalize` - POST action. Re-validates the cookie, runs `onRedirectReturn`, creates the order, runs `afterPlaceOrder`, redirects to order confirmation. Cookie cleared on every response (success or failure) so a refresh / replay cannot re-trigger order creation.
- `/action/payment-webhook?provider=<name>` - Generic webhook dispatcher. Reads the raw body, lowercases all headers, dispatches to the registered `onWebhook` hook. **The framework does NOT verify the signature** — that's the extension's responsibility because each PSP signs differently. Returns 200 to providers when no extension is registered (silent acknowledgment, since forwarding to nowhere is fine).
- `/action/payment-express-complete` - Express checkout completion endpoint for wallet flows (Apple Pay, Google Pay, PayPal Express). Generic across providers - no provider-specific logic in the route itself.

  The flow:

  | Step | Actor | What happens |
  |---|---|---|
  | 1 | Shopper | Taps the wallet button (e.g., Apple Pay) on cart, PDP, or mini cart - bypassing the regular checkout form. |
  | 2 | Provider SDK (client) | Opens its native sheet and collects shipping address, billing address, and payment in one shot. The shopper approves. In an authorize-before-order pattern this approval also produces an authorization on the wallet; in an order-before-payment pattern the approval produces only a token/session - no money has moved yet. |
  | 3 | Provider SDK (client) | POSTs the resulting payment token + addresses to `/action/payment-express-complete`. |
  | 4 | Framework (this route) | Runs the extension's `onExpressComplete` hook, passing the form data. |
  | 5 | Extension `onExpressComplete` | Reads the token and addresses from form data, applies the addresses to the basket, and attaches a payment instrument. (SCAPI requires *an* instrument before `createOrder` will accept the basket - what that instrument represents differs between the two patterns; see below.) |
  | 6 | Framework (this route) | Recalculates basket totals (shipping/tax may have changed based on the wallet-supplied address). |
  | 7 | Framework (this route) | Calls `createOrder`. The order is persisted with whatever payment instrument step 5 attached, which means an authorize-before-order pattern produces an order whose `paymentStatus` reflects the existing auth, while an order-before-payment pattern produces an order with `paymentStatus: 'not_paid'`. |
  | 8 | Framework (this route) | On `createOrder` success: runs `afterPlaceOrder`, then redirects to order confirmation. `afterPlaceOrder`'s job differs by pattern - in authorize-before-order it captures the existing auth (turning it into a settled charge); in order-before-payment it actually attempts the charge, and if that charge fails the extension fails or cancels the order. On `createOrder` failure: runs `onOrderFailure` so the extension can void the auth (authorize-before-order) or release the payment session (order-before-payment, though this is rarely needed since no money has moved). |

Extension route conventions:
- `/action/<provider>-redirect-return` - Handles return from provider redirect
- `/action/<provider>-webhook` - Receives provider webhooks

### Redirect State Cookie

When the shopper is redirected to an external provider, the storefront loses all context on both sides of the wire. On the client, the browser navigates away to (e.g.) PayPal, killing React state and any context provider including the checkout context. On the server, MRT serverless instances have no per-shopper memory, and the return request lands on a potentially-cold instance that has never seen this shopper before. The shopper may be away for minutes, may return on a different network, or in a backgrounded tab. The redirect-state cookie is the only browser-side primitive that travels with the return request automatically, so the server-side return route can pick up where the place-order action left off.

Format: `<url-encoded-json>.<hmac-sha256-hex>` (httpOnly, Secure, SameSite=Lax, 30-min Max-Age)

```typescript
interface PaymentRedirectState {
  stateToken: string;            // server-generated (crypto.randomUUID), correlates return with initiation
  basketId: string;              // verifies basket hasn't changed
  providerName: string;          // routes to correct handler
  idempotencyKey: string;        // prevents double charges
  expiresAt: string;             // ISO timestamp, 30-minute TTL
  providerState: string;         // opaque blob from extension (max 1KB, validated server-side)
  shouldCreateAccount: boolean;  // preserves account-creation preference
  contactPhone: string;          // preserves phone across redirect
}
```

Extensions own the redirect lifecycle using framework utilities:
1. **On redirect:** Extension calls `serializeRedirectCookie()` to write the signed cookie, returns redirect URL
2. **On return:** Extension calls `readRedirectCookie()` to validate, verifies payment with provider API, updates order

### Design Rationale

**Why callbacks on a ref?** Refs are synchronous (no render cycle delays), don't cause re-renders, and work across component boundaries without context nesting.

**Why separate hooks instead of one function?** Each hook runs at a distinct lifecycle moment with different guarantees. `beforePlaceOrder`: safe to fail (no cleanup). `afterPlaceOrder`: order exists, capture or charge. `onOrderFailure`: cleanup auth. A single function would need complex state tracking.

## Error Recovery

**Double-submit prevention:**
- Client: `placeOrderFetcher.state === 'submitting'` guard blocks repeat clicks on "Place order".
- Server (redirect flows): On return from the provider, the redirect-return route validates the `stateToken` cookie, processes the payment, then clears the cookie. If the shopper revisits the return URL (back button, refresh, link replay), there's no valid cookie left to match and the second pass is rejected.
- Provider: see [Idempotency](#idempotency) below.

**Redirect session expiry:** 30-minute TTL. Expired sessions show a message directing the shopper back to checkout.

### Idempotency

The framework generates `framework_idempotencyKey = crypto.randomUUID()` once per checkout session - when `<CheckoutFormPage>` mounts, it stores the key on `PaymentSubmissionRef.idempotencyKey`. The same key then travels with the payment in three places:

1. Auto-appended to every place-order form submission as `framework_idempotencyKey`.
2. Persisted in the redirect-state cookie's `idempotencyKey` field for redirect flows, so it survives the round-trip to an external provider.
3. Forwarded by the extension to the PSP on every API call (e.g., Stripe's `Idempotency-Key` header, Adyen's `idempotencyKey` field).

When the same operation is retried - network retry, server-side resubmission, redirect replay, accidental double-click - the PSP sees the same key and returns the original response instead of treating it as a new charge. This is the last line of defense behind the client-side submit guard and the server-side cookie-clear logic above.

## Deferred Flow Lifecycle

The deferred pattern (bank transfer, crypto, SEPA direct debit) creates the order with `paymentStatus: 'not_paid'` and confirms payment asynchronously via webhook. Because there's a window where an order exists without confirmed payment, the framework needs explicit policy on what happens during that window.

### Flow

| Step | Actor | What happens |
|---|---|---|
| 1 | Shopper | Selects deferred method (e.g., bank transfer) and clicks Place Order |
| 2 | Extension `onPaymentSubmit` | Sets `framework_paymentFlowType: 'deferred'` and calls `submitPlaceOrder` with any provider-issued reference (e.g., a payment-session ID) |
| 3 | Framework (place-order action) | Detects extension active, runs `beforePlaceOrder` (extension attaches a placeholder instrument), creates the order, runs `afterPlaceOrder` (extension records the pending state). Order has `paymentStatus: 'not_paid'`. |
| 4 | Framework (order confirmation) | Renders order confirmation with the **Payment Pending** notice (when `paymentStatus === 'not_paid'` and `paymentInstruments` is empty) |
| 5 | Provider (later, asynchronously) | Sends webhook to `/action/payment-webhook?provider=<name>` |
| 6 | Framework (webhook route) | Reads raw body + headers, dispatches `onWebhook` hook |
| 7 | Extension `onWebhook` | **Verifies signature against raw body**, parses payload, looks up the order, updates payment status |

### Order confirmation refresh

The order confirmation page does NOT auto-poll. The shopper sees the "Payment Pending" notice statically; the order's payment status updates via webhook server-side. Confirmation that payment cleared reaches the shopper via the email notification triggered by the extension when the webhook fires. This avoids:
- Needless polling that consumes SCAPI quota
- A spinner UI that misleadingly suggests imminent confirmation when bank transfers can take days

If a merchant wants live updates on the confirmation page, they can extend the order confirmation route with their own polling or push mechanism — that's a per-merchant decision, not a framework responsibility.

### What if the webhook never arrives

Three layers of recovery:

1. **Provider retry policy.** Most PSPs retry webhooks for hours-to-days on non-2xx responses. The webhook route returns 200 even when no handler is registered (so providers see ack and don't ramp retries against an unconfigured deployment).
2. **Stuck-order job (Commerce Cloud platform).** SCFRA's stuck-orders job detects orders with `paymentStatus: 'not_paid'` after a configurable threshold and fails them. This is the safety net for bank-transfer/crypto where the provider may never confirm because the shopper abandoned.
3. **Extension reconciliation (optional).** Extensions can run a periodic job (cron, queue-driven) that lists pending orders and re-checks their status with the provider's API. This is mostly relevant for low-confirmation-rate methods.

### What the extension MUST do

- Verify webhook signatures against the **raw body bytes**, never against a re-serialized JSON object. Use `verifyHmacSha256(rawBody, signature, secret)` from `lib/payment/webhook-signature.server.ts`.
- Apply a replay-window check (`isWithinReplayWindow`) so a signed-but-stale request can't be replayed by an attacker who captured a webhook.
- Idempotently apply state transitions. The same webhook may arrive twice (provider retry); the extension's order-update logic must be idempotent.

## Saved Payment Methods

Two models, distinguished by *who holds the reusable token and who can charge with it*:

### Token stored on Commerce Cloud (Elavon, CyberSource, etc.)

The gateway issues a `creditCardToken` that Commerce Cloud itself can charge. The token is stored on the Commerce Cloud customer profile, and the platform charges the card directly on reuse - no extension involvement at charge time.

- **Save:** Extension passes `creditCardToken` through formData. Framework creates the order and passes the token to `createPaymentInstrumentForOrder` with `createCustomerPaymentInstrument: true`. Platform preserves the token on the customer profile.
- **Reuse:** Commerce Cloud charges the card directly using the stored token. No extension mediation needed.

The token must come from formData because SCAPI treats `creditCardToken` as write-only (stripped from GET responses).

### Token stored on the provider (Stripe, Adyen, Braintree)

The PSP's tokenization system is opaque to Commerce Cloud, so the reusable payment method lives on the provider's side. Commerce Cloud holds only display metadata (last 4, brand) and must call back through the extension every time a charge is needed.

- **Save:** Framework saves masked card metadata to the CC profile (display only). Extension saves the payment method on the provider's side in `afterPlaceOrder` and stores the PSP's customer ID against the CC customer profile (e.g., `c_stripeCustomerId` custom attribute) so the two sides can be reconnected on reuse.
- **Reuse:** Extension looks up the provider customer, charges the saved method off-session, and passes the result through `beforePlaceOrder`.

### Framework Responsibility

1. Calls savePaymentMethodToCustomerViaOrder after order creation (CC-compatible: includes creditCardToken; external: display metadata only)
2. Reads `formData.get('creditCardToken')` and injects into createPaymentInstrumentForOrder body

## Security Model

### Redirect Cookie Security

**Layer 1 - Transport/access:** httpOnly, Secure, SameSite=Lax, 30-minute Max-Age

**Layer 2 - Integrity:** HMAC-SHA256 signed with PAYMENT_COOKIE_SECRET. Timing-safe comparison. Tampered cookies rejected immediately.

**Layer 3 - Server-generated stateToken:** crypto.randomUUID(), unpredictable by client. Validated on return against signed cookie value with timing-safe comparison.

**Layer 4 - Size/content validation:** providerState capped at 1KB. basketId verified on return. Application-level expiry check.

### Environment Variables

Two env vars supported, in priority order:

- **`PAYMENT_COOKIE_SECRET`** (recommended for production). A key dedicated to redirect cookies. Use this for clean isolation between SCAPI auth and payment-cookie signing — rotating one key doesn't invalidate the other, and a leak of `CLIENT_SECRET` doesn't expose payment-cookie integrity. Recommended for any deployment that handles real money. Generate with: `openssl rand -hex 32`.
- **`CLIENT_SECRET`** (zero-config fallback). Already required for SCAPI auth, so it's guaranteed to be present. Falling back to it lets the redirect framework work out of the box on local dev / staging without additional setup. Trade-off: shared key means a `CLIENT_SECRET` rotation also silently invalidates all in-flight redirect cookies (which auto-expire after 30 minutes anyway, so the blast radius is limited to in-flight checkouts).

MRT is serverless with multiple instances. The signing key must come from the environment (not generated at startup) because the init request and return request may hit different instances.

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Cookie tampering | HMAC signature invalidates modified cookies |
| CSRF via predictable stateToken | Server-generated crypto.randomUUID + timing-safe validation |
| Replay attack | Cookie cleared after processing + 30-min TTL + basketId verification |
| Cookie bloat/overflow | providerState capped at 1KB |
| Timing attacks | timingSafeEqual for HMAC and stateToken |
| XSS reads cookie | httpOnly flag |
| MITM intercepts cookie | Secure flag (TLS only) |

Cookie contains correlation IDs and an opaque provider blob, not bearer tokens or PII. httpOnly+Secure+HMAC matches the security baseline used by the existing auth cookie infrastructure.

---

# Part 2: PSP Integration Guide

This section is for payment service providers (PSPs) or SI partners building a payment extension.

## Extension Directory Structure

```
src/extensions/<your-provider-name>/
  target-config.json              # Registers hooks with the framework
  components/<your-provider>.tsx  # Client-side payment UI
  hooks/before-place-order.ts    # Server hook: verify payment, add instrument to basket
  hooks/after-place-order.ts     # Server hook (optional): capture, save
  hooks/on-order-failure.ts      # Server hook (optional): void/refund on failure
  lib/<your-provider>.server.ts  # Server-only API client
  routes/action.<your-provider>.ts           # Server actions (create session, etc.)
  routes/action.<your-provider>-webhook.ts   # Webhook endpoint (if applicable)
  types.ts                       # Provider-specific types
```

## Step 1: Build the Client Component

Register with the framework and render your payment UI:

```typescript
import { useEffect, useCallback } from 'react';
import type { PaymentSubmissionRef } from '@/hooks/use-checkout-actions';
import type { PaymentSubmitContext } from '../types';

export default function YourProviderPayment({ paymentSubmissionRef }: { paymentSubmissionRef: PaymentSubmissionRef }) {
  const handlePaymentSubmit = useCallback(async ({ submitPlaceOrder, basket }: PaymentSubmitContext) => {
    // 1. Validate and tokenize payment with your SDK
    // 2. (Optional) Create a server-side session via your action route
    // 3. Confirm payment with your provider
    // 4. Call submitPlaceOrder with your provider-specific data
    submitPlaceOrder({ yourProviderToken: 'tok_xxx' });
  }, []);

  useEffect(() => {
    const ref = paymentSubmissionRef.current;
    ref.flowType = 'inline'; // Any non-null value signals extension is active
    ref.onPaymentSubmit = (ctx) => void handlePaymentSubmit(ctx);
    return () => {
      ref.onPaymentSubmit = null;
      ref.flowType = null;
    };
  }, [handlePaymentSubmit, paymentSubmissionRef]);

  return <div>{/* Mount your provider's payment UI here */}</div>;
}
```

## Step 2: Build the Server Hooks

**beforePlaceOrder (required):**

```typescript
import type { BeforePlaceOrderHookData } from '@/lib/payment-gateway.types';

export default async function beforePlaceOrder({ basket, formData }: BeforePlaceOrderHookData, context) {
  const token = formData.get('yourProviderToken');

  // Verify with your provider API
  const verification = await yourProviderClient.verifyPayment(token);
  if (!verification.success) {
    throw new Error('Payment verification failed');
  }

  // Add payment instrument to basket (required for createOrder)
  await addPaymentInstrumentToBasket(context, basket.basketId, {
    paymentMethodId: 'YOUR_PROVIDER',
    amount: basket.orderTotal,
  });
}
```

**afterPlaceOrder (optional):** Capture authorized payment or save methods on the PSP for later reuse.

**onOrderFailure (optional):** Void/refund authorization if order creation fails.

## Step 3: Register Hooks

```json
{
  "hooks": {
    "CHECKOUT_PAYMENTS_BEFORE_PLACE_ORDER": { "module": "./hooks/before-place-order.ts" },
    "CHECKOUT_PAYMENTS_AFTER_PLACE_ORDER": { "module": "./hooks/after-place-order.ts" },
    "CHECKOUT_PAYMENTS_ON_ORDER_FAILURE": { "module": "./hooks/on-order-failure.ts" }
  }
}
```

## Step 4: Provide Provider Credentials

Extensions need a publishable key on the client and a secret key on the server. How those credentials reach the running process is a deployment decision, not a framework concern - the framework only requires that the extension can read them on the server.

**For this POC, the Stripe reference extension keeps credentials in environment variables for simplicity:**

```bash
YOUR_PROVIDER_SECRET_KEY=sk_test_xxx
PUBLIC__app__paymentGateway__yourProviderPublishableKey=pk_test_xxx
```

**For production, store the keys in a secure way.** Common patterns:

- **Commerce Cloud Business Manager** - Store credentials as site preferences or custom attributes on the merchant tools side and expose them through a server-side SCAPI/OCAPI call. The extension fetches them once per cold start (or on-demand with caching). This is the recommended pattern for merchants already operating Commerce Cloud.
- **Secret manager** - AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, etc. The extension fetches at server boot and caches.
- **Per-request lookup** - For multi-tenant deployments where credentials vary per site/locale.

The framework intentionally does not prescribe one approach. Extension authors implement credential loading inside their server-side hooks and `lib/<provider>.server.ts` modules.

## Step 5: Handle Redirect Flows (if applicable)

1. In `onPaymentSubmit`, call `submitPlaceOrder({ framework_paymentFlowType: 'redirect', ... })` - the framework creates the order first
2. In `afterPlaceOrder`, initiate redirect session with your provider, serialize state with `serializeRedirectCookie()`, return `{ redirectUrl }`
3. Create a return route that calls `readRedirectCookie()`, verifies payment with your provider API, updates order status

**Example return route:**

```typescript
// routes/action.your-provider-redirect-return.ts
import { redirect } from 'react-router';
import { readRedirectCookie, clearRedirectCookie } from '@/lib/payment-redirect.server';

export async function loader({ request, context }) {
  const cookieState = await readRedirectCookie(request);
  if (!cookieState) {
    return redirect('/checkout?error=session_expired');
  }

  // Verify payment with your provider API using cookieState.providerState
  const paymentStatus = await yourProvider.verifyPayment(cookieState.providerState);

  if (paymentStatus === 'succeeded') {
    const headers = clearRedirectCookie();
    return redirect(`/order-confirmation/${orderNo}`, { headers });
  }

  return redirect('/checkout?error=payment_failed');
}
```

**Example afterPlaceOrder initiating redirect:**

```typescript
import { serializeRedirectCookie } from '@/lib/payment-redirect.server';

// Inside afterPlaceOrder, when framework_paymentFlowType === 'redirect':
const session = await yourProvider.createRedirectSession({
  amount: order.orderTotal,
  returnUrl: formData.get('yourProviderReturnUrl'),
  metadata: { orderNo: order.orderNo },
});

await serializeRedirectCookie(context, {
  stateToken: crypto.randomUUID(),
  basketId: basket.basketId,
  providerName: 'your-provider',
  idempotencyKey: formData.get('framework_idempotencyKey'),
  providerState: session.id,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  shouldCreateAccount: formData.get('shouldCreateAccount') === 'true',
  contactPhone: formData.get('contactPhone') || '',
});

return { redirectUrl: session.redirectUrl };
```

## Step 6: Handle Webhooks (if applicable)

1. Create a route at `routes/action.your-provider-webhook.ts`
2. Verify the webhook signature using your provider's SDK
3. Update order payment status accordingly

## Multi-Flow Extension Example

A single extension supporting cards (inline) and redirect methods (iDEAL, Klarna):

```typescript
// In onPaymentSubmit - decide flow dynamically based on selected method
ref.onPaymentSubmit = async (ctx) => {
  if (selectedMethod === 'ideal' || selectedMethod === 'klarna') {
    ctx.submitPlaceOrder({ framework_paymentFlowType: 'redirect', paymentMethod: selectedMethod });
  } else {
    // Card - authorize first, then submit
    const result = await confirmCardPayment(ctx.basket);
    ctx.submitPlaceOrder({ framework_paymentFlowType: 'inline', authToken: result.token });
  }
};
```

Server hooks branch on `formData.get('framework_paymentFlowType')` to handle both paths.

