# Engagement analytics

How storefront **analytics events** flow into **Einstein (CQuotient)** and **Active Data**, how each adapter encodes them, and where to configure behavior. Use this for **adapter-level and reporting** notes; use [README-CONFIG-OPTIONS.md](./README-CONFIG-OPTIONS.md) → `## engagement` for the full **config key** reference.

**Related docs**

- **Config** — [`README-CONFIG-OPTIONS.md`](./README-CONFIG-OPTIONS.md) → `## engagement` (`enabled`, hosts, IDs, **`eventToggles`** per adapter).
- **Adapter registration & env overrides** — [`README-ADAPTER-PATTERN-GUIDE.md`](./README-ADAPTER-PATTERN-GUIDE.md) (engagement sections).
- **Multi-site** — [`README-MULTI-SITE.md`](./README-MULTI-SITE.md) → *Engagement Data & Site Context* (how `siteInfo` is passed at send time; Einstein vs Active Data).
- **Consent** — [`README-CONSENT-TRACKING.md](./README-CONSENT-TRACKING.md).

**Source of truth in code**

- **Event union** — `packages/storefront-next-runtime/src/events/types.ts` (`AnalyticsEvent`, `createEvent`).
- **Hooks / callsites** — [`src/hooks/use-analytics.ts`](../src/hooks/use-analytics.ts).
- **Registration** — [`src/adapters/index.ts`](../src/adapters/index.ts) (`initializeEngagementAdapters`), [`src/lib/adapters/initialize-adapters.ts`](../src/lib/adapters/initialize-adapters.ts) (`ensureAdaptersInitialized`).
- **Adapters** — [`src/adapters/einstein.ts`](../src/adapters/einstein.ts), [`src/adapters/active-data.ts`](../src/adapters/active-data.ts).

---

## Overview: from hook to adapters

1. **`useAnalytics()`** (and related tracking) builds typed events via **`createEvent`** from `@salesforce/storefront-next-runtime/events`.
2. The **event mediator** fans each event out to **every registered engagement adapter** (Einstein, Active Data, etc.) after **consent** and **session** checks (see consent doc).
3. Each adapter’s **`sendEvent`** checks **`config.eventToggles[event.eventType]`** — if `false`, that adapter drops the event for that type.
4. Adapters translate the storefront event into **their own HTTP shape** (Einstein Activities vs Commerce Cloud **`__Analytics-Start`**).

**Event toggles** — Per-adapter booleans keyed by every `AnalyticsEvent['eventType']`. They do not register new types with remote services; they only gate whether **this storefront** sends that type to that adapter.

---

## Einstein adapter

- **Transport:** `navigator.sendBeacon` to CQuotient **`/v3/activities/{realm}-{siteId}/{activityKind}?clientId=...`** (see [Einstein Activities](https://developer.salesforce.com/docs/commerce/einstein-api/references/einstein-activities)).
- **Mapping:** `einteinEventToEndpointMap` in [`einstein.ts`](../src/adapters/einstein.ts) maps each storefront **`eventType`** to an Einstein **activity segment** (`viewPage`, `viewProduct`, `addToCart`, …). Payload fields are built in **`convertEventToEinsteinActivity`** (product, category, basket, `currentLocation` for page-style events, etc.).
- **URLs in payloads:** Product/page URLs for schema and activities use **public origin** helpers where applicable so internal hostnames are not sent (see adapter code and comments).

Einstein **`siteId` / realm** in config are **static** at init; see multi-site doc for how that differs from Active Data at event time.

---

## Active Data adapter

- **Transport:** `navigator.sendBeacon` to a **first-party proxy** (`/resource/analytics-proxy?url=...`) so **`dwsid`** can be forwarded; the proxied URL targets **`__Analytics-Start`** on the configured **Commerce Cloud host** with site and locale in the path.
- **Allowed storefront events:** `sendEvent` only forwards **`view_page`**, **`view_product`**, **`view_search`**, **`view_category`**, **`view_recommender`**, and **`commerce_agent_engagement`** (others return without sending). See the allowlist in [`active-data.ts`](../src/adapters/active-data.ts).
- **Payload:** **`extractActiveDataParamsFromEvent`** fills **base** query params (`url` from `window.location.href`, `title`, `ref`, screen size, etc.) and event-specific params (e.g. `pcat`, search/category refinement blobs, product impression **`event3`/`event4`** data). **`createActiveDataUrls`** splits long URLs if needed.

Active Data uses **`siteInfo.siteId`** and **`siteInfo.localeId`** at **send time** (from site context middleware).

---

## Commerce agent engagement (special case)

Some storefront **`AnalyticsEvent`** types have **no** matching Einstein activity or Active Data “event slot.” **`commerce_agent_engagement`** is one: it fires when a shopper opens agentic commerce from the **header** or **search** assistant.

- **`surface: 'header'`** — header sparkles (`launchChat()`).
- **`surface: 'search'`** — assistant card in search suggestions (`openShopperAgentAndSendMessage()`).

**Tracking API:** **`useAnalytics().trackCommerceAgentEngagement({ surface })`**. Same consent/auth rules as other `useAnalytics` methods ([README-CONSENT-TRACKING.md](./README-CONSENT-TRACKING.md)).

**Toggles:** `commerce_agent_engagement` exists on every adapter’s **`eventToggles`** (full map required by TypeScript). In the default **`config.server.ts`**, Einstein, Data Cloud, and Active Data all set this key to **`true`** so agent opens are sent everywhere adapters are enabled. Set **`false`** on Active Data (or any adapter) if you want to stop **`__Analytics-Start`** traffic for agent opens only.

**Einstein:** No dedicated activity; mapped to **`viewPage`**. **`currentLocation`** is set to synthetic paths **`/__sfnext/commerce-agent/header`** or **`/__sfnext/commerce-agent/search`** so exports that include **`viewPage` + `currentLocation`** can segment agent opens from real navigations.

**Active Data:** Same **`__Analytics-Start`** style as other allowed events, plus query param **`sfn-cagent-surface`** = `header` | `search`.
