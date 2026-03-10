import { SpanStatusCode } from "@opentelemetry/api";
import { ATTR_HTTP_REQUEST_METHOD, ATTR_SERVICE_NAME, ATTR_URL_PATH } from "@opentelemetry/semantic-conventions";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";

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
function initTelemetry() {
	try {
		const provider = new NodeTracerProvider({ resource: new Resource({ [ATTR_SERVICE_NAME]: SERVICE_NAME }) });
		provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
		provider.register();
		return provider.getTracer(SERVICE_NAME);
	} catch (error) {
		console.error("[otel] Failed to initialize OpenTelemetry:", error);
		return null;
	}
}

//#endregion
//#region src/otel/instrumentation.ts
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
	await tracer.startActiveSpan(spanName, { attributes }, async (span) => {
		try {
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
}
/**
* HTTP attributes common to all spans.
* url.path only — url.full would expose query params which may contain auth
* tokens or PII. http.response.status_code is not available from
* unstable_InstrumentationHandlerResult.
*/
function httpAttributes(request) {
	return {
		[ATTR_HTTP_REQUEST_METHOD]: request.method,
		[ATTR_URL_PATH]: new URL(request.url).pathname
	};
}
const platformInstrumentation = {
	handler(handler) {
		handler.instrument({ async request(handleRequest, { request }) {
			await traced("request", httpAttributes(request), handleRequest);
		} });
	},
	route(route) {
		function routeAttributes(unstable_pattern) {
			return {
				"rr.route.id": route.id,
				"rr.route.pattern": unstable_pattern
			};
		}
		route.instrument({
			async loader(handleLoader, { unstable_pattern }) {
				await traced("loader", routeAttributes(unstable_pattern), handleLoader);
			},
			async action(handleAction, { unstable_pattern }) {
				await traced("action", routeAttributes(unstable_pattern), handleAction);
			},
			async middleware(handleMiddleware, { unstable_pattern }) {
				await traced("middleware", routeAttributes(unstable_pattern), handleMiddleware);
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
* - Prepends a platform instrumentation to unstable_instrumentations
*/
function composeServerEntry(appModule) {
	return {
		...appModule,
		default(request, statusCode, headers, context, loadContext) {
			return appModule.default(request, statusCode, headers, context, loadContext);
		},
		unstable_instrumentations: [platformInstrumentation, ...appModule.unstable_instrumentations ?? []]
	};
}

//#endregion
export { composeServerEntry };
//# sourceMappingURL=server.js.map