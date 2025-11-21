//#region src/events/events.ts
/**
* Type-safe event creation function
*
* This generic function allows creating any event type under AnalyticsEvent
* with full type safety. The event type is inferred from the string literal
* passed as the first parameter, and TypeScript will enforce the correct
* data properties for that specific event type.
*
* @example
* ```typescript
* const viewPageEvent = createEvent('view_page', { path: '/products', payload });
* const viewProductEvent = createEvent('view_product', { product, payload });
* ```
*/
function createEvent(eventType, data) {
	return {
		eventType,
		...data
	};
}
/**
* Send a view page event to the event mediator
*
* This wrapper function is used in the automated page view event tracking client middleware.
* This function exists to support build-time checks and type safety.
*
* @param event - The view page event to send
* @param eventMediator - The event mediator to send the event to
*/
function sendViewPageEvent(event, eventMediator) {
	eventMediator.track(event);
}

//#endregion
//#region src/events/mediator.ts
/**
* Initialize event mediator
*
* @param getAdapters - Function that returns the current array of engagmenet adapters.
*                      This function is called on each track() invocation to ensure
*                      the mediator always uses the latest adapters from the adapter registry.
* @returns EventMediator instance
*/
function initializeEventMediator(getAdapters) {
	return { track: (event) => {
		processEventWithAdapters(event, getAdapters).catch((error) => {
			console.error("Analytics tracking failed:", error);
		});
	} };
}
/**
* Process an event with all registered adapters
*
* @param event - The analytics event to process
* @param getAdapters - Function that returns the current array of event adapters
*/
async function processEventWithAdapters(event, getAdapters) {
	const eventAdapters = getAdapters();
	if (eventAdapters.length === 0) {
		console.warn(`There are no active adapters to send the event to`);
		return;
	}
	const promises = eventAdapters.map(async (adapter) => {
		try {
			if (typeof adapter.sendEvent === "function") await adapter.sendEvent(event);
			else console.warn(`Adapter ${adapter.name} does not implement sendEvent`);
		} catch (error) {
			console.error(`Failed to send event to ${adapter.name}:`, error);
		}
	});
	await Promise.allSettled(promises);
}

//#endregion
export { createEvent, initializeEventMediator, sendViewPageEvent };
//# sourceMappingURL=events.js.map