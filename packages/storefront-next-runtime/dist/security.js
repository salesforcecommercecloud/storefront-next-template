import { createContext } from "react-router";
import { randomBytes } from "node:crypto";
import { z } from "zod";

//#region src/security/defaults.ts
/**
* SDK default CSP directives. Customers extending CSP should spread this:
*
* ```ts
* import { defaultCspDirectives } from '@salesforce/storefront-next-runtime/security';
* security: {
*   csp: {
*     directives: {
*       ...defaultCspDirectives,
*       'script-src': [...defaultCspDirectives['script-src']!, 'https://cdn.foo.com'],
*     },
*   },
* }
* ```
*
* The per-request nonce is appended to `script-src` at request time; it is
* NOT in this static map.
*/
const defaultCspDirectives = {
	"default-src": ["'self'"],
	"script-src": ["'self'", "https://challenges.cloudflare.com"],
	"style-src": ["'self'", "'unsafe-inline'"],
	"img-src": [
		"'self'",
		"data:",
		"https://*.commercecloud.salesforce.com",
		"https://*.demandware.net"
	],
	"font-src": ["'self'", "data:"],
	"connect-src": [
		"'self'",
		"https://*.commercecloud.salesforce.com",
		"https://*.demandware.net",
		"https://challenges.cloudflare.com"
	],
	"frame-src": ["https://challenges.cloudflare.com"],
	"frame-ancestors": ["'self'"],
	"form-action": ["'self'"],
	"base-uri": ["'self'"],
	"object-src": ["'none'"],
	"upgrade-insecure-requests": true
};
const defaultSecurityHeaders = {
	enabled: true,
	csp: {
		directives: defaultCspDirectives,
		reportOnly: false
	},
	hsts: {
		maxAge: 15552e3,
		includeSubDomains: true,
		preload: false
	},
	frameOptions: "SAMEORIGIN",
	contentTypeOptions: "nosniff",
	referrerPolicy: "strict-origin-when-cross-origin",
	permissionsPolicy: {
		camera: [],
		microphone: [],
		geolocation: []
	}
};

//#endregion
//#region src/security/nonce.ts
/** 16 bytes (128 bits) of CSPRNG-grade entropy, base64-encoded → 24 chars. */
const NONCE_BYTES = 16;
/** Generate a fresh CSP nonce. Each request must call this exactly once. */
function generateNonce() {
	return randomBytes(NONCE_BYTES).toString("base64");
}
/** React Router context carrying the current request's CSP nonce. */
const securityContext = createContext(null);
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
function getSecurityNonce(context) {
	return context.get(securityContext)?.nonce ?? null;
}

//#endregion
//#region src/security/schema.ts
const VALID_CSP_DIRECTIVES = [
	"default-src",
	"script-src",
	"style-src",
	"img-src",
	"font-src",
	"connect-src",
	"frame-src",
	"frame-ancestors",
	"form-action",
	"base-uri",
	"object-src",
	"manifest-src",
	"media-src",
	"worker-src",
	"child-src",
	"report-uri",
	"report-to",
	"upgrade-insecure-requests"
];
const cspDirectivesSchema = z.record(z.string(), z.union([z.array(z.string()), z.literal(true)])).superRefine((directives, ctx) => {
	for (const name of Object.keys(directives)) {
		if (!VALID_CSP_DIRECTIVES.includes(name)) ctx.addIssue({
			code: "custom",
			message: `Invalid CSP directive name "${name}". Valid: ${VALID_CSP_DIRECTIVES.join(", ")}`,
			path: [name]
		});
		if (name === "upgrade-insecure-requests") {
			if (directives[name] !== true) ctx.addIssue({
				code: "custom",
				message: `'upgrade-insecure-requests' must be the literal value true`,
				path: [name]
			});
		} else if (!Array.isArray(directives[name])) ctx.addIssue({
			code: "custom",
			message: `Directive "${name}" must be a string array`,
			path: [name]
		});
	}
});
const cspConfigSchema = z.object({
	directives: cspDirectivesSchema.optional(),
	reportOnly: z.boolean().optional()
});
const hstsConfigSchema = z.object({
	maxAge: z.number().int().nonnegative().optional(),
	includeSubDomains: z.boolean().optional(),
	preload: z.boolean().optional()
});
const referrerPolicySchema = z.enum([
	"no-referrer",
	"no-referrer-when-downgrade",
	"origin",
	"origin-when-cross-origin",
	"same-origin",
	"strict-origin",
	"strict-origin-when-cross-origin",
	"unsafe-url"
]);
const securityConfigSchema = z.object({
	enabled: z.boolean().optional(),
	csp: z.union([cspConfigSchema, z.literal(false)]).optional(),
	hsts: z.union([hstsConfigSchema, z.literal(false)]).optional(),
	frameOptions: z.union([z.enum(["DENY", "SAMEORIGIN"]), z.literal(false)]).optional(),
	contentTypeOptions: z.union([z.literal("nosniff"), z.literal(false)]).optional(),
	referrerPolicy: z.union([referrerPolicySchema, z.literal(false)]).optional(),
	permissionsPolicy: z.union([z.record(z.string(), z.array(z.string())), z.literal(false)]).optional()
});
/**
* Validate a `SecurityConfig`. Throws a `ZodError` with a clear message on
* invalid directive names or value shapes. Called once at server boot.
*/
function parseSecurityConfig(input) {
	return securityConfigSchema.parse(input);
}

//#endregion
//#region src/security/serialize.ts
/**
* Serialize a `CspDirectives` map to a CSP header string.
*
* If `nonce` is provided, it is appended to `script-src` (creating it
* if absent). Empty directive arrays are omitted.
* `upgrade-insecure-requests` is serialized as a bare keyword.
*/
function serializeCsp(directives, options) {
	const parts = [];
	let scriptSrcEmitted = false;
	for (const [name, value] of Object.entries(directives)) {
		if (name === "upgrade-insecure-requests") {
			if (value === true) parts.push("upgrade-insecure-requests");
			continue;
		}
		const sources = value;
		if (!sources || sources.length === 0) continue;
		if (name === "script-src" && options?.nonce) {
			parts.push(`script-src ${[...sources, `'nonce-${options.nonce}'`].join(" ")}`);
			scriptSrcEmitted = true;
		} else parts.push(`${name} ${sources.join(" ")}`);
	}
	if (options?.nonce && !scriptSrcEmitted) parts.push(`script-src 'nonce-${options.nonce}'`);
	return parts.join("; ");
}
/**
* Serialize a Permissions-Policy map to a header string.
*
* Per the W3C structured-field grammar, the keywords `self` and `*` are
* emitted unquoted; all other allowlist entries are emitted as quoted
* strings (the schema rejects malformed origins before they reach here).
* Empty allowlists serialize to `name=()` (deny).
*
* Reference: https://www.w3.org/TR/permissions-policy/#permissions-policy-http-header-field
*/
function serializePermissionsPolicy(policy) {
	return Object.entries(policy).map(([feature, allowlist]) => {
		if (allowlist.length === 0) return `${feature}=()`;
		return `${feature}=(${allowlist.map((origin) => origin === "self" || origin === "*" ? origin : `"${origin}"`).join(" ")})`;
	}).join(", ");
}
/**
* Serialize an HSTS config to a header string.
*/
function serializeHsts(hsts) {
	const parts = [`max-age=${hsts.maxAge}`];
	if (hsts.includeSubDomains) parts.push("includeSubDomains");
	if (hsts.preload) parts.push("preload");
	return parts.join("; ");
}

//#endregion
//#region src/security/middleware.ts
/**
* Read at boot. HSTS is suppressed when running locally (BUNDLE_ID unset
* or 'local') because HSTS pins the host in browser caches — pinning
* `localhost` would force HTTPS on every developer's `pnpm dev`.
*/
function isRemote() {
	const id = process.env.BUNDLE_ID;
	return Boolean(id) && id !== "local";
}
/**
* Merge customer config with SDK defaults. Per-directive replace: any
* directive the customer sets fully replaces the SDK default for that key
* (object spread semantics).
*
* Narrows defaults via a runtime check rather than `as Required<...>` casts,
* so a future change that sets `defaults.csp = false` or `defaults.hsts = false`
* is caught here instead of producing `max-age=undefined` at the wire.
*/
function resolve(input) {
	const defaultsCsp = defaultSecurityHeaders.csp === false ? null : defaultSecurityHeaders.csp;
	const defaultsHsts = defaultSecurityHeaders.hsts === false ? null : defaultSecurityHeaders.hsts;
	return {
		enabled: input.enabled ?? defaultSecurityHeaders.enabled,
		csp: input.csp === false ? false : {
			directives: {
				...defaultsCsp?.directives ?? {},
				...input.csp?.directives ?? {}
			},
			reportOnly: input.csp?.reportOnly ?? false
		},
		hsts: input.hsts === false ? false : input.hsts === void 0 ? defaultsHsts ?? false : {
			...defaultsHsts ?? {
				maxAge: 0,
				includeSubDomains: false,
				preload: false
			},
			...input.hsts
		},
		frameOptions: input.frameOptions ?? defaultSecurityHeaders.frameOptions,
		contentTypeOptions: input.contentTypeOptions ?? defaultSecurityHeaders.contentTypeOptions,
		referrerPolicy: input.referrerPolicy ?? defaultSecurityHeaders.referrerPolicy,
		permissionsPolicy: input.permissionsPolicy ?? defaultSecurityHeaders.permissionsPolicy
	};
}
/**
* Boot-time warnings. Logged once per server start when potentially
* unsafe configurations are active.
*/
function warnIfUnsafe(resolved) {
	if (!resolved.enabled) {
		console.warn("[security] All security headers disabled via config. This is not recommended for production.");
		return;
	}
	if (resolved.csp === false) console.warn("[security] CSP disabled via config. Other headers still applied.");
	else if (resolved.csp.reportOnly) console.warn("[security] CSP is in report-only mode. This is intended for migration only. Set csp.reportOnly to false before going to production.");
	if (resolved.csp !== false) {
		const scriptSrc = resolved.csp.directives["script-src"];
		if (Array.isArray(scriptSrc) && !scriptSrc.includes("'self'")) console.warn("[security] CSP script-src does not include 'self'. The inline window.__APP_CONFIG__ script may fail to execute.");
	}
}
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
function createSecurityHeadersMiddleware(input = {}) {
	parseSecurityConfig(input);
	const resolved = resolve(input);
	warnIfUnsafe(resolved);
	const staticHsts = isRemote() && resolved.hsts !== false ? serializeHsts(resolved.hsts) : null;
	const permissionsHeader = resolved.permissionsPolicy === false ? null : serializePermissionsPolicy(resolved.permissionsPolicy);
	const cspHeaderName = resolved.csp !== false && resolved.csp.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
	let staticCspBody = null;
	let baseScriptSrc = "";
	if (resolved.csp !== false) {
		const { "script-src": scriptSrc,...rest } = resolved.csp.directives;
		staticCspBody = serializeCsp(rest);
		baseScriptSrc = (scriptSrc ?? []).join(" ");
	}
	/**
	* Apply the resolved security headers to a response. Pulled into a helper
	* so we can run it on the success path AND on a thrown Response (RR
	* loaders/actions throw `Response` for 404/redirect/etc.). Without this,
	* a 404 error response would ship without security headers.
	*/
	const applyHeaders = (response, nonce) => {
		if (staticCspBody !== null && nonce !== null) {
			const scriptSrcClause = baseScriptSrc.length > 0 ? `script-src ${baseScriptSrc} 'nonce-${nonce}'` : `script-src 'nonce-${nonce}'`;
			const csp = staticCspBody.length > 0 ? `${staticCspBody}; ${scriptSrcClause}` : scriptSrcClause;
			response.headers.set(cspHeaderName, csp);
		}
		if (staticHsts !== null) response.headers.set("Strict-Transport-Security", staticHsts);
		if (resolved.frameOptions !== false) response.headers.set("X-Frame-Options", resolved.frameOptions);
		if (resolved.contentTypeOptions !== false) response.headers.set("X-Content-Type-Options", resolved.contentTypeOptions);
		if (resolved.referrerPolicy !== false) response.headers.set("Referrer-Policy", resolved.referrerPolicy);
		if (permissionsHeader !== null) response.headers.set("Permissions-Policy", permissionsHeader);
		return response;
	};
	return async (args, next) => {
		if (!resolved.enabled) return next();
		const nonce = resolved.csp === false ? null : generateNonce();
		if (nonce !== null) args.context.set(securityContext, { nonce });
		try {
			return applyHeaders(await next(), nonce);
		} catch (err) {
			if (err instanceof Response) throw applyHeaders(err, nonce);
			throw err;
		}
	};
}

//#endregion
export { createSecurityHeadersMiddleware, defaultCspDirectives, defaultSecurityHeaders, getSecurityNonce, securityContext };
//# sourceMappingURL=security.js.map