import { SpanStatusCode, propagation } from "@opentelemetry/api";
import { ATTR_HTTP_REQUEST_METHOD, ATTR_SERVICE_NAME, ATTR_URL_PATH } from "@opentelemetry/semantic-conventions";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { AlwaysOnSampler, ConsoleSpanExporter, ParentBasedSampler, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ExportResultCode, W3CTraceContextPropagator, hrTimeToTimeStamp } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import chalk from "chalk";

//#region src/otel/mrt-console-span-exporter.ts
var MrtConsoleSpanExporter = class extends ConsoleSpanExporter {
	export(spans, resultCallback) {
		for (const span of spans) try {
			const ctx = span.spanContext();
			const spanData = {
				traceId: ctx.traceId,
				parentId: span.parentSpanId,
				name: span.name,
				id: ctx.spanId,
				kind: span.kind,
				timestamp: hrTimeToTimeStamp(span.startTime),
				duration: span.duration,
				attributes: span.attributes,
				status: span.status,
				events: span.events,
				links: span.links,
				start_time: span.startTime,
				end_time: span.endTime,
				forwardTrace: process.env.SFNEXT_OTEL_ENABLED === "true"
			};
			console.info(JSON.stringify(spanData));
		} catch {}
		resultCallback({ code: ExportResultCode.SUCCESS });
	}
};

//#endregion
//#region src/utils/logger.ts
const LEVEL_PRIORITY = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3
};
let overrideLevel;
/**
* Returns true when the `DEBUG` env var targets sfnext or is a general enable flag.
* Avoids accidentally enabling debug mode when DEBUG is set for unrelated libraries
* (e.g. `DEBUG=express:*`).
*/
function debugEnablesSfnext() {
	const raw = process.env.DEBUG?.trim();
	if (!raw) return false;
	const normalized = raw.toLowerCase();
	if ([
		"1",
		"true",
		"yes",
		"on"
	].includes(normalized)) return true;
	return raw.split(",").some((token) => {
		const value = token.trim();
		return value === "*" || value === "sfnext" || value === "sfnext:*";
	});
}
function resolveLevel() {
	if (overrideLevel) return overrideLevel;
	const envLevel = process.env.MRT_LOG_LEVEL ?? process.env.SFCC_LOG_LEVEL;
	if (envLevel && envLevel in LEVEL_PRIORITY) return envLevel;
	if (debugEnablesSfnext()) return "debug";
	if (process.env.NODE_ENV === "production") return "warn";
	return "info";
}
function shouldLog(level) {
	return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[resolveLevel()];
}
const logger = {
	error(msg, ...args) {
		if (!shouldLog("error")) return;
		console.error(chalk.red("[sfnext:error]"), msg, ...args);
	},
	warn(msg, ...args) {
		if (!shouldLog("warn")) return;
		console.warn(chalk.yellow("[sfnext:warn]"), msg, ...args);
	},
	info(msg, ...args) {
		if (!shouldLog("info")) return;
		console.log(chalk.cyan("[sfnext:info]"), msg, ...args);
	},
	debug(msg, ...args) {
		if (!shouldLog("debug")) return;
		console.log(chalk.gray("[sfnext:debug]"), msg, ...args);
	},
	setLevel(level) {
		overrideLevel = level;
	},
	getLevel() {
		return resolveLevel();
	}
};

//#endregion
//#region src/otel/setup.ts
const SERVICE_NAME = "storefront-next";
/**
* Initializes OpenTelemetry and returns a Tracer from the provider directly.
*
* Returns the tracer via `provider.getTracer()` instead of the global
* `trace.getTracer()` API. In the Vite SSR module runner, the built
* dist/entry/server.js and the externalized @opentelemetry/sdk-trace-node
* resolve @opentelemetry/api to different module instances (different paths
* through pnpm's strict node_modules). Each instance has its own
* ProxyTracerProvider singleton, so `provider.register()` sets the delegate
* on sdk-trace-node's API instance while our code's `trace.getTracer()`
* reads from a separate API instance with no delegate — returning a tracer
* backed by a bare BasicTracerProvider with NoopSpanProcessor.
*
* Getting the tracer directly from the provider bypasses the global registry
* entirely, guaranteeing the tracer uses our configured span processors.
*/
let cachedTracer = null;
const UNDICI_REGISTERED_KEY = Symbol.for("sfnext.otel.undici_registered");
function initTelemetry() {
	if (cachedTracer) return cachedTracer;
	try {
		const provider = new NodeTracerProvider({
			resource: new Resource({ [ATTR_SERVICE_NAME]: SERVICE_NAME }),
			sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() })
		});
		provider.addSpanProcessor(new SimpleSpanProcessor(new MrtConsoleSpanExporter()));
		provider.register();
		propagation.setGlobalPropagator(new W3CTraceContextPropagator());
		if (!globalThis[UNDICI_REGISTERED_KEY]) {
			globalThis[UNDICI_REGISTERED_KEY] = true;
			registerInstrumentations({
				tracerProvider: provider,
				instrumentations: [new UndiciInstrumentation({ requestHook(span, request) {
					try {
						const method = request.method.toUpperCase();
						const url = `${request.origin}${request.path}`;
						span.updateName(`${method} ${url}`);
					} catch {}
				} })]
			});
		}
		cachedTracer = provider.getTracer(SERVICE_NAME);
		return cachedTracer;
	} catch (error) {
		logger.error("[otel] Failed to initialize OpenTelemetry:", error);
		return null;
	}
}

//#endregion
//#region src/otel/react-router/instrumentation.ts
const tracer = process.env.SFNEXT_OTEL_ENABLED === "true" ? initTelemetry() : null;
/**
* Runs `handle` inside an active OTel span, recording errors and ending the span.
* When `tracer` is null (OTel disabled), calls `handle` directly with no overhead.
*/
async function traced(spanName, attributes, handle) {
	if (!tracer) {
		await handle();
		return;
	}
	let handled = false;
	try {
		await tracer.startActiveSpan(spanName, { attributes }, async (span) => {
			try {
				handled = true;
				const result = await handle();
				if (result.status === "error" && result.error) {
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: result.error.message
					});
					span.recordException(result.error);
				}
			} finally {
				span.end();
			}
		});
	} catch {
		if (!handled) await handle();
	}
}
/**
* HTTP attributes common to all spans.
* url.path only — url.full would expose query params which may contain auth
* tokens or PII. http.response.status_code is not available from
* InstrumentationHandlerResult.
*/
function httpAttributes(request) {
	const attrs = { [ATTR_HTTP_REQUEST_METHOD]: request.method };
	try {
		attrs[ATTR_URL_PATH] = new URL(request.url).pathname;
	} catch {}
	return attrs;
}
const platformInstrumentation = {
	handler(handler) {
		handler.instrument({ async request(handleRequest, { request }) {
			await traced("react-router ssr", httpAttributes(request), handleRequest);
		} });
	},
	route(route) {
		function routeAttributes(pattern) {
			return {
				"rr.route.id": route.id,
				"rr.route.pattern": pattern
			};
		}
		route.instrument({
			async loader(handleLoader, { pattern }) {
				await traced(`loader (${route.id})`, routeAttributes(pattern), handleLoader);
			},
			async action(handleAction, { pattern }) {
				await traced(`action (${route.id})`, routeAttributes(pattern), handleAction);
			},
			async middleware(handleMiddleware, { pattern }) {
				await traced(`middleware (${route.id})`, routeAttributes(pattern), handleMiddleware);
			}
		});
	}
};

//#endregion
//#region src/entry/server.ts
/**
* Composes a server entry module with platform-level features.
*
* - Spreads all app module properties to forward unknown/future exports
* - Wraps the default handler for platform-level processing
* - Prepends a platform instrumentation to instrumentations
*/
function composeServerEntry(appModule) {
	if (process.env.NODE_ENV !== "production" && "unstable_instrumentations" in appModule && !("instrumentations" in appModule)) console.warn("[storefront-next] entry.server exports `unstable_instrumentations`, which React Router 7.18 no longer reads. Rename the export to `instrumentations` or it will not register.");
	return {
		...appModule,
		default(request, statusCode, headers, context, loadContext) {
			return appModule.default(request, statusCode, headers, context, loadContext);
		},
		instrumentations: [platformInstrumentation, ...appModule.instrumentations ?? []]
	};
}

//#endregion
export { composeServerEntry };
//# sourceMappingURL=server.js.map