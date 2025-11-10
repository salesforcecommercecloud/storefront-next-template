//#region src/design/messaging-api/messenger.ts
/**
* Handles the basic logic for event emitting and receiving between a client and a host.
*
* The `Messenger` class manages a single connection to a source event emitter,
* allowing for the sending and receiving of typed events between two parties (e.g., client and host).
* It distinguishes events based on their source, ensuring that only events from the opposite source are processed.
*
* @template TInMapping - The mapping of incoming event names to their payload types.
* @template TOutMapping - The mapping of outgoing event names to their payload types.
*/
var Messenger = class {
	source;
	id;
	emitter;
	handlers = /* @__PURE__ */ new Map();
	remoteId;
	logger;
	unsubscribe;
	constructor({ source, id, emitter, logger = () => {} }) {
		this.source = source;
		this.id = id;
		this.emitter = emitter;
		this.logger = logger;
	}
	/**
	* Connects the given emitter. This ensures only a single connection to the provided emitter.
	*
	* This method registers a listener for events from the opposite source.
	* It ensures that only events from the opposite source are processed.
	*/
	connect() {
		this.unsubscribe?.();
		this.unsubscribe = this.emitter.addEventListener((event) => {
			if (event.meta?.pdMessagingApi && event.meta.source !== this.source) {
				this.logger(event, this.source === "host" ? "client" : "host");
				[event.eventType, "Event"].forEach((eventType) => {
					this.handlers.get(eventType)?.forEach((handler) => handler(event));
				});
			}
		});
	}
	/**
	* Returns the id of the connected remote.
	*/
	getRemoteId() {
		return this.remoteId;
	}
	/**
	* Sets the id of the connected remote.
	*/
	setRemoteId(remoteId) {
		this.remoteId = remoteId;
	}
	/**
	* Emits an event to the connected remote.
	* This attaches metadata to each event that is emitted.
	*
	* @param eventName - The event to emit.
	* @param data - The data to emit.
	* @param options - The options for the event.
	* @param options.requireRemoteId - Whether to require a remote id to be set before emitting the event.
	*/
	emit(eventType, data, { requireRemoteId = true } = {}) {
		if (requireRemoteId && !this.remoteId) return;
		const event = {
			...data,
			eventType,
			meta: {
				hostId: this.source === "host" ? this.id : this.remoteId,
				clientId: this.source === "client" ? this.id : this.remoteId,
				source: this.source,
				pdMessagingApi: true
			}
		};
		this.logger(event, this.source);
		this.emitter.postMessage(event);
	}
	/**
	* Subscribes to an event from the connected remote.
	*
	* @param event - The event to subscribe to.
	* @param handler - The handler to call when the event is emitted.
	* @returns A function to unsubscribe from the event.
	*/
	on(event, handler) {
		const handlers = this.handlers.get(event) ?? [];
		handlers.push(handler);
		this.handlers.set(event, handlers);
		return () => {
			const eventHandlers = this.handlers.get(event) ?? [];
			const index = eventHandlers.indexOf(handler);
			if (index > -1) eventHandlers.splice(index, 1);
			if (eventHandlers.length === 0) this.handlers.delete(event);
		};
	}
	/**
	* Returns a function that emits an event to the connected remote.
	*
	* @param eventName - The event to emit.
	* @returns A function that emits an event to the connected remote.
	*/
	toEmitter(eventName) {
		return (event) => {
			this.emit(eventName, event);
		};
	}
	toPromise(eventName) {
		return new Promise((resolve) => {
			const unsub = this.on(eventName, (event) => {
				unsub();
				resolve(event);
			});
		});
	}
	/**
	* Disconnects the messenger.
	*/
	disconnect() {
		this.unsubscribe?.();
		this.handlers.clear();
		this.remoteId = void 0;
		this.unsubscribe = void 0;
	}
};

//#endregion
//#region src/design/messaging-api/client.ts
/**
* Factory function to create a ClientApi instance.
*
* @public
* @param _config - Configuration object for the client API (currently unused).
* @returns {ClientApi} An instance of the ClientApi interface.
*/
function createClientApi({ emitter, id, forwardedKeys = [], logger }) {
	const messenger = new Messenger({
		source: "client",
		id,
		emitter,
		logger
	});
	const subscriptions = [];
	let isReady = false;
	let isConnected = false;
	let connectionTimeoutId = null;
	let hostConfig = null;
	const clearConnectionTimeout = () => {
		if (connectionTimeoutId) {
			clearTimeout(connectionTimeoutId);
			connectionTimeoutId = null;
		}
	};
	return {
		addComponentToRegion: messenger.toEmitter("ComponentAddedToRegion"),
		moveComponentToRegion: messenger.toEmitter("ComponentMovedToRegion"),
		startComponentDrag: messenger.toEmitter("ComponentDragStarted"),
		hoverInToComponent: messenger.toEmitter("ComponentHoveredIn"),
		hoverOutOfComponent: messenger.toEmitter("ComponentHoveredOut"),
		selectComponent: messenger.toEmitter("ComponentSelected"),
		deselectComponent: messenger.toEmitter("ComponentDeselected"),
		deleteComponent: messenger.toEmitter("ComponentDeleted"),
		notifyWindowScrollChanged: messenger.toEmitter("WindowScrollChanged"),
		notifyClientReady: messenger.toEmitter("ClientReady"),
		notifyError: messenger.toEmitter("Error"),
		connect: ({ interval = 1e3, timeout = 6e4, prepareClient = () => Promise.resolve(), onHostConnected, onError } = {}) => {
			if (isConnected) {
				onHostConnected?.(hostConfig);
				return;
			}
			const expirationTime = Date.now() + timeout;
			messenger.connect();
			subscriptions.push(messenger.on("ClientAcknowledged", async (event) => {
				if (event.meta.hostId === messenger.getRemoteId()) return;
				hostConfig = event;
				messenger.setRemoteId(event.meta.hostId);
				clearConnectionTimeout();
				try {
					await prepareClient();
					isReady = true;
					messenger.emit("ClientReady", { clientId: id });
					onHostConnected?.(hostConfig);
				} catch (error) {
					onError?.(error);
				}
			}));
			const checkInitialization = () => {
				if (Date.now() > expirationTime) throw new Error(`Timed out after waiting ${timeout}ms for host connection`);
				messenger.emit("ClientInitialized", {
					clientId: id,
					forwardedKeys
				}, { requireRemoteId: false });
				connectionTimeoutId = setTimeout(() => checkInitialization(), interval);
			};
			isConnected = true;
			checkInitialization();
		},
		on: (eventName, handler) => messenger.on(eventName, (event) => {
			if (eventName === "ClientAcknowledged" || isReady) handler(event);
		}),
		disconnect: () => {
			clearConnectionTimeout();
			messenger.emit("ClientDisconnected", { clientId: id });
			isConnected = false;
			subscriptions.forEach((unsubscribe) => unsubscribe());
			messenger.disconnect();
		},
		getRemoteId: () => messenger.getRemoteId()
	};
}

//#endregion
export { Messenger as n, createClientApi as t };
//# sourceMappingURL=client-yD3sT5Kq.js.map