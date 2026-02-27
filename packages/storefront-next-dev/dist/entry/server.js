//#region src/entry/server.ts
/**
* Platform-level handler instrumentation.
*
* Uses React Router's unstable_ServerInstrumentation API to observe the
* request lifecycle at the handler level. This runs around ALL requests
* (document + data) and provides a hook for platform-level tracing.
*
* @see https://reactrouter.com/how-to/instrumentation
*/
const platformInstrumentation = { handler(handler) {
	handler.instrument({ async request(handleRequest) {
		await handleRequest();
	} });
} };
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