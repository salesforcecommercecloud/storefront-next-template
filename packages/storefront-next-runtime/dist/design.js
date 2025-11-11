import { n as isPreviewModeActive, t as isDesignModeActive } from "./modeDetection-BZMGik06.js";
import { n as Messenger, t as createClientApi } from "./client-DdJSpo_h.js";

//#region src/design/componentRegistry.ts
/**
* A generic registry for managing components with support for design-time decoration.
* This registry allows components to be registered and retrieved in different modes,
* with optional decoration for design-time usage.
*
* @template TComponent - The type of components stored in this registry
* @example
* import type React from 'react';
* import pkg from 'commerce-sdk-isomorphic';
* const { design: { ComponentRegistry, createReactDesignDecorator } } = pkg;
*
* const registry = new ComponentRegistry<React.Component>({
*   designDecorator: createReactDesignDecorator(),
* });
*
* registry.registerComponent('commerce/productList', ProductListComponent);
*
* const ProductList = registry.getComponent('commerce/productList');
*
* // Get the component in design mode - the component will be decorated
* const ProductList = registry.getComponent('commerce/productList');
*/
var ComponentRegistry = class {
	registry = /* @__PURE__ */ new Map();
	designDecorator;
	/**
	* @param options - Configuration options for the registry
	* @param options.designDecorator - Optional function to decorate components when retrieved in design mode.
	*                                  If not provided, components are returned unchanged in design mode.
	*/
	constructor({ designDecorator = (component) => component } = {}) {
		this.designDecorator = designDecorator;
	}
	/**
	* Registers a component in the registry with the specified name.
	* If a component with the same name already exists, it will be overwritten.
	*
	* @param name - The unique identifier for the component
	* @param component - The component to register
	*/
	registerComponent(name, component) {
		this.registry.set(name, component);
	}
	/**
	* Retrieves a component from the registry by its identifier.
	* The component may be decorated based on the specified mode.
	*
	* @param id - The identifier of the component to retrieve
	* @param options - Options for component retrieval
	* @param options.mode - The mode in which to retrieve the component. Defaults to 'runtime'.
	* @returns The component if found, null otherwise. In design mode, the component will be decorated.
	*/
	getComponent(id) {
		const component = this.registry.get(id) ?? null;
		return component && isDesignModeActive() ? this.designDecorator(component) : component;
	}
};

//#endregion
//#region src/design/messaging-api/host.ts
const defaultConfigFactory = () => Promise.resolve({
	components: {},
	componentTypes: {},
	labels: {}
});
/**
* Factory function to create a HostApi instance.
*
* @public
* @param {HostConfiguration} config - Configuration object for the host API.
* @returns {HostApi} An instance of the HostApi interface.
*/
function createHostApi({ emitter, id, logger }) {
	const messenger = new Messenger({
		source: "host",
		id,
		emitter,
		logger
	});
	const subscriptions = [];
	let isConnected = false;
	return {
		addComponentToRegion: messenger.toEmitter("ComponentAddedToRegion"),
		moveComponentToRegion: messenger.toEmitter("ComponentMovedToRegion"),
		startComponentDrag: messenger.toEmitter("ComponentDragStarted"),
		hoverInToComponent: messenger.toEmitter("ComponentHoveredIn"),
		hoverOutOfComponent: messenger.toEmitter("ComponentHoveredOut"),
		selectComponent: messenger.toEmitter("ComponentSelected"),
		deselectComponent: messenger.toEmitter("ComponentDeselected"),
		deleteComponent: messenger.toEmitter("ComponentDeleted"),
		forwardKeyPress: messenger.toEmitter("HostKeyPressed"),
		notifyClientWindowDragDropped: messenger.toEmitter("ClientWindowDragDropped"),
		notifyClientWindowDragEntered: messenger.toEmitter("ClientWindowDragEntered"),
		notifyClientWindowDragMoved: messenger.toEmitter("ClientWindowDragMoved"),
		notifyClientWindowDragExited: messenger.toEmitter("ClientWindowDragExited"),
		setComponentProperties: messenger.toEmitter("ComponentPropertiesChanged"),
		notifyWindowScrollChanged: messenger.toEmitter("WindowScrollChanged"),
		notifyPageSettingsChanged: messenger.toEmitter("PageSettingsChanged"),
		notifyMediaChanged: () => messenger.emit("MediaChangedEvent", {}),
		notifyError: messenger.toEmitter("Error"),
		focusComponent: messenger.toEmitter("ComponentFocused"),
		connect: ({ configFactory = defaultConfigFactory, onClientConnected, onClientDisconnected, onError }) => {
			if (isConnected) {
				onClientConnected?.(messenger.getRemoteId() ?? "");
				return;
			}
			messenger.connect();
			subscriptions.push(messenger.on("ClientDisconnected", (event) => {
				if (event.meta.clientId === messenger.getRemoteId()) messenger.setRemoteId(void 0);
				onClientDisconnected?.(event.meta.clientId ?? "");
			}));
			subscriptions.push(messenger.on("ClientInitialized", async (event) => {
				const remoteId = messenger.getRemoteId();
				if (remoteId && event.meta.clientId === remoteId || !remoteId) {
					messenger.setRemoteId(event.meta.clientId);
					try {
						const config = await configFactory();
						messenger.emit("ClientAcknowledged", config);
						const { clientId } = await messenger.toPromise("ClientReady");
						if (clientId !== messenger.getRemoteId()) throw new Error("Client id mismatch");
						onClientConnected?.(clientId);
					} catch (error) {
						onError?.(error);
					}
				}
			}));
			isConnected = true;
		},
		on: (event, handler) => messenger.on(event, handler),
		disconnect: () => {
			isConnected = false;
			messenger.disconnect();
			subscriptions.forEach((unsubscribe) => unsubscribe());
		},
		getRemoteId: () => messenger.getRemoteId()
	};
}

//#endregion
export { ComponentRegistry, createClientApi, createHostApi, isDesignModeActive, isPreviewModeActive };
//# sourceMappingURL=design.js.map