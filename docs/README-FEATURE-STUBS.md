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

### Customer interests & preferences

| Field | Details |
|-------|---------|
| **Status** | Stub — no backend integration |
| **Location** | `src/extensions/customer-preferences/` |
| **Surfaces** | Account details page (`/account`) |
| **Extension** | `SFDC_EXT_CUSTOMER_PREFERENCES` (named "(Demo) Customer Preferences" in `src/extensions/config.json`) |

**Current behavior:**
The Interests & Preferences section on the account page is fully functional, but is backed by mock fixtures and an in-memory store in `lib/api/customer-preferences.server.ts`. Reads return canned catalogs (design styles, room types, materials, aesthetics, product categories, shopping preferences, room measurements, size preference); writes persist only for the lifetime of the server process and are not shared across multi-process or serverless deployments.

**To productionize:**
Replace the bodies of `getCustomerPreferencesData`, `updateCustomerInterests`, and `updateCustomerPreferences` in `src/extensions/customer-preferences/lib/api/customer-preferences.server.ts` with calls to your real customer profile / personalization backend. The loader (`src/routes/_app.account._index.tsx`) and the action route (`src/extensions/customer-preferences/routes/action.customer-preferences-update.tsx`) do not need to change. Drop the `(Demo)` prefix from the extension name in `src/extensions/config.json` once a real backend is wired up.

**To remove:**
Uninstall the extension by stripping the `@sfdc-extension-*` markers from core files and deleting the extension folder.

Files to delete:
- `src/extensions/customer-preferences/` (entire folder)

Parent components to update (remove the marker block):
- `src/routes/_app.account._index.tsx` — the `<UITarget targetId="sfcc.myAccount.preferences" />` block and its loader Promise

Config updates:
- Remove `SFDC_EXT_CUSTOMER_PREFERENCES` from `src/extensions/config.json`
- Re-run `pnpm locales:aggregate-extensions` and `pnpm smoke-test:generate`

---

### Buy Now Pay Later (BNPL)

| Field | Details |
|-------|---------|
| **Status** | Stub — no backend integration |
| **Location** | `src/extensions/bnpl/` |
| **Surfaces** | Product detail page (PDP), beneath the Add to Cart button |
| **Extension** | `SFDC_EXT_BNPL` (named "(Demo) Buy Now Pay Later" in `src/extensions/config.json`) |

**Current behavior:**
The inline installment message ("Pay in 4 interest-free payments of …") and the "Learn more" modal (payment schedule + how-it-works steps + provider disclosures) are fully functional but backed by mock fixtures in `lib/api/bnpl.server.ts`. The fixtures return the same payment schedule for every product — the `productId` argument is accepted but ignored. Currency formatting honors the active site/locale via `useSite()`.

**To productionize:**
Replace the bodies of `getBuyNowPayLaterMessage` and `getBuyNowPayLaterLearnMore` in `src/extensions/bnpl/lib/api/bnpl.server.ts` with calls into your BNPL provider's API (PayPal, Klarna, Affirm, etc.). The PDP loader (`src/routes/_app.product.$productId.tsx`) and the UITarget wrapper (`components/target/bnpl-target.tsx`) do not need to change. Drop the `(Demo)` prefix from the extension name in `src/extensions/config.json` once a real provider is wired up.

**To remove:**
Uninstall the extension by stripping the `@sfdc-extension-*` markers from core files and deleting the extension folder.

Files to delete:
- `src/extensions/bnpl/` (entire folder)

Parent components to update (remove the marker block):
- `src/routes/_app.product.$productId.tsx` — the `bnplMessage` / `bnplLearnMore` loader Promises and the import
- `src/components/product-cart-actions/index.tsx` — the `<UITarget targetId="sfcc.pdp.bnpl.message" />` block

Config updates:
- Remove `SFDC_EXT_BNPL` from `src/extensions/config.json`
- Re-run `pnpm locales:aggregate-extensions` and `pnpm smoke-test:generate`

---

<!-- Add new stubs below using the same format -->
