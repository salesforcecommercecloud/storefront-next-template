import { a as HstsConfig, c as SecurityConfig, i as CspDirectives, n as defaultSecurityHeaders, o as ReferrerPolicyValue, r as CspConfig, s as ResolvedSecurityConfig, t as defaultCspDirectives } from "./defaults.js";
import * as react_router0 from "react-router";
import { MiddlewareFunction, RouterContextProvider } from "react-router";

//#region src/security/middleware.d.ts

/**
 * Create the React Router middleware that applies default security
 * response headers.
 *
 * - Validates customer config via zod at factory call (boot). Throws on
 *   invalid directive names with a clear message.
 * - Generates a fresh CSP nonce per request (16 bytes / 24 base64 chars).
 *   Sets it on `securityContext` for `getSecurityNonce()` consumers.
 * - Merges customer directives over SDK defaults (per-directive replace).
 * - HSTS is suppressed locally — emitted only when running on MRT
 *   (BUNDLE_ID set and not 'local').
 *
 * @param input - Customer security config from `config.server.ts`. Any
 * field omitted falls back to the SDK default.
 *
 * Reads (at boot, once):
 * - `process.env.BUNDLE_ID` — when set and not 'local', emit HSTS.
 *
 * @example
 * ```ts
 * const mw = createSecurityHeadersMiddleware(config.security);
 * // register in root.tsx middleware chain before appConfigMiddleware
 * ```
 */
declare function createSecurityHeadersMiddleware(input?: SecurityConfig): MiddlewareFunction<Response>;
//#endregion
//#region src/security/nonce.d.ts
/** React Router context carrying the current request's CSP nonce. */
declare const securityContext: react_router0.RouterContext<{
  nonce: string;
} | null>;
/**
 * Read the current request's CSP nonce. Returns `null` when the security
 * middleware is disabled. Server-only — call from a loader or action.
 *
 * Naming: `get*` (not `use*`) because this is not a React hook — it reads
 * the React Router context directly. Mirrors `getLocale` / `getTranslation`
 * in the i18n module.
 *
 * The nonce is meaningful only on the SSR-rendered inline script. On
 * client navigations, the loader runs again and returns a fresh nonce,
 * but no new CSP header is emitted, so the loader-returned value should
 * not be applied to scripts injected client-side.
 *
 * @example
 * ```ts
 * // In root.tsx loader:
 * const nonce = getSecurityNonce(args.context);
 * return { nonce, ...other };
 * ```
 */
declare function getSecurityNonce(context: Readonly<RouterContextProvider>): string | null;
//#endregion
export { type CspConfig, type CspDirectives, type HstsConfig, type ReferrerPolicyValue, type ResolvedSecurityConfig, type SecurityConfig, createSecurityHeadersMiddleware, defaultCspDirectives, defaultSecurityHeaders, getSecurityNonce, securityContext };
//# sourceMappingURL=security.d.ts.map