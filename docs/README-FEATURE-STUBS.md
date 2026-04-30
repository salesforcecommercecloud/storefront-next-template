# Feature Stubs

This document lists all feature stubs shipped in the storefront template. Feature stubs are working UI scaffolds — layout, styling, interaction states, and accessibility — that are **not backed by real backend integrations**. They exist to accelerate development by giving you a head start on the UI, so you can focus on wiring up the business logic unique to your brand.

## Why stubs exist

Stubs let you:

- See the storefront with a realistic feature set from day one
- Reuse production-quality UI (responsive grids, accessibility, design tokens) without building from scratch
- Decide per-feature whether to integrate, customize, or remove

## How to find stubs in code

All stubs are marked with the `@feature-stub` JSDoc tag:

```typescript
/**
 * @feature-stub Feature name
 * @status stub — description of current state
 *
 * ...
 */
```

Search the codebase:

```bash
grep -r "@feature-stub" src/
```

## Stub Registry

### Express checkout buttons

| Field | Details |
|-------|---------|
| **Status** | Stub — no backend integration |
| **Location** | `src/components/checkout/components/express-payments.tsx` |
| **Surfaces** | Checkout page, Product detail page (PDP) |
| **Providers shown** | Apple Pay, Google Pay, Amazon Pay, PayPal, Venmo |

**Current behavior:**
Clicking any button triggers an `alert()` dialog. No payment is processed and no order is created.

**To productionize:**
Replace with your payment provider's SDK integration (Stripe, Adyen, Braintree, etc.):
1. Load the provider's client-side SDK
2. Initialize a payment session with your merchant credentials
3. Collect the payment token on user approval
4. Submit the token through your checkout flow (SCAPI `/checkout/shopper-orders` or provider endpoint)

**To remove:**
Delete the following files and remove `<ExpressPayments />` from parent components.

Files to delete:
- `src/components/checkout/components/express-payments.tsx`
- `src/components/checkout/components/express-payments.test.tsx`
- `src/components/checkout/components/static-paypal-button.tsx`
- `src/components/checkout/components/static-venmo-button.tsx`
- `src/components/checkout/components/apple-pay-logo.tsx`
- `src/components/checkout/components/google-pay-logo.tsx`
- `src/components/checkout/components/amazon-pay-logo.tsx`
- `src/components/checkout/components/paypal-logo.tsx`
- `src/components/checkout/components/venmo-logo.tsx`
- `src/components/checkout/components/stories/express-payments.stories.tsx`
- `src/components/checkout/components/stories/express-payments-snapshot.tsx`
- `src/components/checkout/components/stories/apple-pay-logo.stories.tsx`
- `src/components/checkout/components/stories/google-pay-logo.stories.tsx`
- `src/components/checkout/components/stories/amazon-pay-logo.stories.tsx`
- `src/components/checkout/components/stories/paypal-logo.stories.tsx`
- `src/components/checkout/components/stories/venmo-logo.stories.tsx`
- `src/components/checkout/components/stories/static-paypal-button.stories.tsx`
- `src/components/checkout/components/stories/static-venmo-button.stories.tsx`

Parent components to update (remove the `<ExpressPayments />` import and usage):
- `src/components/checkout/checkout-form-page.tsx`
- `src/components/product-cart-actions/index.tsx`

Translation keys to remove (`expressPayments` objects):
- `src/locales/en-GB/translations.json` — `checkout.expressPayments.*` and `product.expressPayments.*`
- `src/locales/it-IT/translations.json` — same keys
- Any additional locale files in `src/locales/`

---

<!-- Add new stubs below using the same format -->
