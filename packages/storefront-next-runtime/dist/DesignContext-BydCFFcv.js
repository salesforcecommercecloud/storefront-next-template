import { n as isPreviewModeActive, t as isDesignModeActive } from "./modeDetection-BZMGik06.js";
import { t as createClientApi } from "./client-DdJSpo_h.js";
import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

//#region src/design/react/context/PageDesignerProvider.tsx
const LazyDesignProvider = lazy(() => import("./DesignContext-_8ZapPNE.js").then((module) => ({ default: module.DesignProvider })));
const LazyPreviewProvider = lazy(() => import("./PreviewContext-BDox5UnQ.js").then((module) => ({ default: module.PreviewProvider })));
const LoadingFallback = () => null;
const PageDesignerContext = createContext({
	isDesignMode: false,
	isPreviewMode: false
});
const usePageDesignerMode = () => useContext(PageDesignerContext);
const PageDesignerProvider = ({ children, targetOrigin, clientId, clientLogger, clientConnectionTimeout, clientConnectionInterval, mode }) => {
	const contextValue = useMemo(() => ({
		isDesignMode: mode === "design" || isDesignModeActive(),
		isPreviewMode: mode === "preview" || isPreviewModeActive()
	}), [mode]);
	const { isDesignMode, isPreviewMode } = contextValue;
	if (isDesignMode && !targetOrigin) throw new Error("PageDesignerProvider: targetOrigin is required when in design mode for security reasons. This should be the origin of the host application that contains this iframe ");
	if (!isDesignMode && !isPreviewMode) return <>{children}</>;
	let content = children;
	if (isPreviewMode) content = <Suspense fallback={<LoadingFallback />}>
                <LazyPreviewProvider>{content}</LazyPreviewProvider>
            </Suspense>;
	if (isDesignMode) content = <Suspense fallback={<LoadingFallback />}>
                <LazyDesignProvider targetOrigin={targetOrigin} clientId={clientId} clientLogger={clientLogger} clientConnectionTimeout={clientConnectionTimeout} clientConnectionInterval={clientConnectionInterval}>
                    {content}
                </LazyDesignProvider>
            </Suspense>;
	return <PageDesignerContext.Provider value={contextValue}>{content}</PageDesignerContext.Provider>;
};
PageDesignerProvider.defaultProps = {
	clientConnectionTimeout: 6e4,
	clientConnectionInterval: 1e3,
	mode: void 0,
	clientLogger: () => {}
};

//#endregion
//#region src/design/react/hooks/useInteraction.ts
/**
* Base hook that provides common interaction patterns for design-time functionality.
* Reduces boilerplate by handling state management, event listeners, and cleanup.
*
* @param config - Configuration object defining the interaction behavior
* @returns Object containing state and action methods
*/
function useInteraction(config) {
	const [state, setState] = useState(config.initialState);
	const { isDesignMode, clientApi } = useDesignContext();
	useEffect(() => {
		if (!isDesignMode || !clientApi) return () => {};
		const unsubscribeFunctions = Object.entries(config.eventHandlers ?? {}).map(([eventName, entry]) => clientApi.on(eventName, (event) => entry.handler(event, setState)));
		return () => {
			unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
		};
	}, [
		isDesignMode,
		clientApi,
		config.eventHandlers
	]);
	return {
		state,
		...config.actions?.(state, setState, clientApi ?? null) ?? {}
	};
}

//#endregion
//#region src/design/react/hooks/useSelectInteraction.ts
/**
* Custom hook that manages component selection state and handles
* client-host communication for selection events.
*
* @param isDesignMode - Whether design mode is active
* @param clientApi - Client API for host communication
* @returns Selection state and interaction methods
*/
function useSelectInteraction() {
	const { state: selectedComponentId, setSelectedComponent } = useInteraction({
		initialState: "",
		eventHandlers: {
			ComponentSelected: { handler: (event, setState) => {
				setState(event.componentId);
			} },
			ComponentDeselected: { handler: (_, setState) => {
				setState("");
			} }
		},
		actions: (_state, setState, clientApi) => ({ setSelectedComponent: (componentId) => {
			setState(componentId);
			clientApi?.selectComponent({ componentId });
		} })
	});
	return {
		selectedComponentId,
		setSelectedComponent
	};
}

//#endregion
//#region src/design/react/hooks/useHoverInteraction.ts
/**
* Custom hook that manages component hover state and handles
* client-host communication for hover events.
*
* @returns Hover state and interaction methods
*/
function useHoverInteraction() {
	const { state: hoveredComponentId, setHoveredComponent } = useInteraction({
		initialState: null,
		eventHandlers: {
			ComponentHoveredIn: { handler: (event, setState) => setState(event.componentId) },
			ComponentHoveredOut: { handler: (_, setState) => setState(null) }
		},
		actions: (state, setState, clientApi) => ({ setHoveredComponent: (componentId) => {
			if (state && componentId !== state) clientApi?.hoverOutOfComponent({ componentId: state });
			if (componentId && componentId !== state) clientApi?.hoverInToComponent({ componentId });
			setState(componentId);
		} })
	});
	return {
		hoveredComponentId,
		setHoveredComponent
	};
}

//#endregion
//#region src/design/react/hooks/useDeleteInteraction.ts
function useDeleteInteraction({ selectedComponentId, setSelectedComponent }) {
	const { deleteComponent } = useInteraction({
		initialState: null,
		eventHandlers: {},
		actions: (_state, _setState, clientApi) => ({ deleteComponent: (event) => {
			clientApi?.deleteComponent(event);
			if (selectedComponentId === event.componentId) setSelectedComponent("");
		} })
	});
	return { deleteComponent };
}

//#endregion
//#region src/design/react/hooks/useFocusInteraction.ts
function useFocusInteraction({ setSelectedComponent }) {
	const { state: focusedComponentId, focusComponent } = useInteraction({
		initialState: null,
		eventHandlers: { ComponentFocused: { handler: (event, setState) => {
			setSelectedComponent("");
			setState(event.componentId);
		} } },
		actions: (_state, setState) => ({ focusComponent: (node) => {
			node.scrollIntoView();
			setState(null);
		} })
	});
	return {
		focusedComponentId,
		focusComponent
	};
}

//#endregion
//#region src/design/react/hooks/useComponentDiscovery.ts
/**
* Returns a utility for discovering components and regions at a given
* x, y coordinates.
* @param nodeToTargetMap - The map of nodes to target entries.
*/
function useComponentDiscovery({ nodeToTargetMap }) {
	return useCallback(({ x, y, filter = () => true }) => {
		const nodeStack = document.elementsFromPoint(x, y);
		const results = [];
		for (let i = 0; i < nodeStack.length; i += 1) {
			const node = nodeStack[i];
			const entry = nodeToTargetMap.get(node);
			if (entry && filter(entry)) results.push({
				...entry,
				node
			});
		}
		return results;
	}, [nodeToTargetMap]);
}

//#endregion
//#region src/design/react/utils/regionUtils.ts
/**
* Checks if a component type is allowed in a region based on inclusion and exclusion rules.
*
* @param componentType - The type of component being checked
* @param componentTypeInclusions - Array of allowed component types (if empty, all types are allowed by default)
* @param componentTypeExclusions - Array of forbidden component types
* @returns true if the component type is allowed, false otherwise
*/
function isComponentTypeAllowedInRegion(componentType, componentTypeInclusions, componentTypeExclusions) {
	if (!componentType) return false;
	if (componentTypeExclusions?.includes(componentType)) return false;
	if (componentTypeInclusions?.length > 0) return componentTypeInclusions.includes(componentType);
	return true;
}

//#endregion
//#region src/design/react/hooks/useDragInteraction.ts
const SCROLL_BUFFER_HEIGHT_PERCENTAGE = 15;
const SCROLL_BUFFER_MIN_HEIGHT_IN_PIXELS = 50;
const SCROLL_INTERVAL_IN_MS = 1e3 / 60;
const SCROLL_BASE_AMOUNT_IN_PIXELS = 50;
function getInsertionType({ cache, node, x, y, direction }) {
	const rect = cache.get(node) ?? node.getBoundingClientRect();
	cache.set(node, rect);
	if (direction === "row") return x < rect.left + rect.width / 2 ? "before" : "after";
	return y < rect.top + rect.height / 2 ? "before" : "after";
}
function isOnSelfDropTarget({ sourceComponentId, beforeComponentId, afterComponentId, insertType, componentId }) {
	return sourceComponentId && componentId === sourceComponentId || sourceComponentId && insertType === "before" && beforeComponentId === sourceComponentId || sourceComponentId && insertType === "after" && afterComponentId === sourceComponentId;
}
function useDragInteraction({ nodeToTargetMap }) {
	const discoverComponents = useComponentDiscovery({ nodeToTargetMap });
	const getNearestComponentAndRegion = useCallback((x, y) => {
		const stack = discoverComponents({
			x,
			y
		});
		let component = null;
		let region = null;
		for (let i = 0; i < stack.length; i += 1) {
			const entry = stack[i];
			if (entry.regionId && entry.regionDirection) {
				if (entry.type === "component") component = entry;
				else if (entry.type === "region") {
					region = entry;
					break;
				}
			}
		}
		return {
			component,
			region
		};
	}, [discoverComponents]);
	const getInsertionComponentIds = (componentId, region) => {
		const componentIndex = region.componentIds.indexOf(componentId);
		return [region.componentIds[componentIndex - 1], region.componentIds[componentIndex + 1]];
	};
	const getCurrentDropTarget = useCallback(({ x, y, rectCache, componentType, sourceComponentId }) => {
		const { component, region } = getNearestComponentAndRegion(x, y);
		if (region) {
			if (!isComponentTypeAllowedInRegion(componentType, region.componentTypeInclusions || [], region.componentTypeExclusions || [])) return null;
			const insertType = component ? getInsertionType({
				cache: rectCache,
				node: component.node,
				x,
				y,
				direction: region.regionDirection
			}) : "after";
			const [beforeComponentId, afterComponentId] = component ? getInsertionComponentIds(component.componentId, region) : [];
			if (isOnSelfDropTarget({
				sourceComponentId,
				beforeComponentId,
				afterComponentId,
				insertType,
				componentId: component?.componentId ?? ""
			})) return null;
			return {
				type: component ? "component" : "region",
				regionId: region.regionId,
				regionDirection: region.regionDirection,
				componentIds: region.componentIds,
				componentId: component?.componentId ?? "",
				parentId: region.parentId,
				beforeComponentId,
				afterComponentId,
				insertComponentId: component?.componentId,
				insertType,
				componentTypeInclusions: region.componentTypeInclusions,
				componentTypeExclusions: region.componentTypeExclusions
			};
		}
		return null;
	}, [getNearestComponentAndRegion]);
	const computeScrollFactor = ({ y, windowHeight }) => {
		const bufferHeight = Math.max(windowHeight * (SCROLL_BUFFER_HEIGHT_PERCENTAGE / 100), SCROLL_BUFFER_MIN_HEIGHT_IN_PIXELS);
		const bottomBufferStart = windowHeight - bufferHeight;
		if (y > bottomBufferStart) return (y - bottomBufferStart) / bufferHeight;
		if (y < bufferHeight) return (y - bufferHeight) / bufferHeight;
		return 0;
	};
	const computeScrollDirection = (factor) => {
		if (factor > 0) return 1;
		if (factor < 0) return -1;
		return 0;
	};
	const scrollFactorRef = useRef(0);
	const { state: dragState, commitCurrentDropTarget, updateComponentMove, startComponentMove, dropComponent, cancelDrag } = useInteraction({
		initialState: {
			isDragging: false,
			componentType: "",
			sourceComponentId: void 0,
			sourceRegionId: void 0,
			x: 0,
			y: 0,
			currentDropTarget: null,
			pendingTargetCommit: false,
			rectCache: /* @__PURE__ */ new WeakMap()
		},
		eventHandlers: {
			ComponentDragStarted: { handler: (event, setState) => {
				scrollFactorRef.current = 0;
				setState((prevState) => ({
					...prevState,
					componentType: event.componentType,
					sourceComponentId: void 0,
					sourceRegionId: void 0,
					x: 0,
					y: 0,
					isDragging: true,
					currentDropTarget: null,
					pendingTargetCommit: false,
					scrollDirection: 0,
					rectCache: /* @__PURE__ */ new WeakMap()
				}));
			} },
			ClientWindowDragExited: { handler: (_, setState) => {
				scrollFactorRef.current = 0;
				setState((prevState) => ({
					...prevState,
					componentType: "",
					x: 0,
					y: 0,
					isDragging: false,
					currentDropTarget: null,
					scrollDirection: 0,
					pendingTargetCommit: false
				}));
			} },
			ClientWindowDragMoved: { handler: (event, setState) => {
				scrollFactorRef.current = computeScrollFactor({
					y: event.y,
					windowHeight: window.innerHeight
				});
				setState((prevState) => ({
					...prevState,
					x: event.x,
					y: event.y,
					isDragging: true,
					scrollDirection: computeScrollDirection(scrollFactorRef.current),
					currentDropTarget: getCurrentDropTarget({
						x: event.x,
						y: event.y,
						rectCache: dragState.rectCache,
						componentType: prevState.componentType,
						sourceComponentId: dragState.sourceComponentId
					})
				}));
			} },
			ClientWindowDragDropped: { handler: (_, setState) => {
				setState((prevState) => ({
					...prevState,
					isDragging: false,
					pendingTargetCommit: true
				}));
			} }
		},
		actions: (state, setState, clientApi) => ({
			cancelDrag: () => {
				scrollFactorRef.current = 0;
				setState((prevState) => ({
					...prevState,
					x: 0,
					y: 0,
					scrollDirection: 0,
					isDragging: false
				}));
			},
			updateComponentMove: ({ x, y }) => {
				scrollFactorRef.current = computeScrollFactor({
					y,
					windowHeight: window.innerHeight
				});
				setState((prevState) => ({
					...prevState,
					x,
					y,
					scrollDirection: computeScrollDirection(scrollFactorRef.current),
					currentDropTarget: getCurrentDropTarget({
						x,
						y,
						rectCache: state.rectCache,
						componentType: state.componentType,
						sourceComponentId: state.sourceComponentId
					})
				}));
			},
			dropComponent: () => {
				setState((prevState) => ({
					...prevState,
					isDragging: false,
					pendingTargetCommit: true
				}));
			},
			startComponentMove: (componentId, regionId) => {
				scrollFactorRef.current = 0;
				setState((prevState) => ({
					...prevState,
					x: 0,
					y: 0,
					sourceComponentId: componentId,
					sourceRegionId: regionId,
					isDragging: true,
					scrollDirection: 0,
					rectCache: /* @__PURE__ */ new WeakMap()
				}));
			},
			commitCurrentDropTarget: () => {
				if (state.currentDropTarget) {
					if (state.sourceComponentId) {
						if (state.currentDropTarget.componentId !== state.sourceComponentId) clientApi?.moveComponentToRegion({
							componentId: state.sourceComponentId,
							sourceRegionId: state.sourceRegionId ?? "",
							insertType: state.currentDropTarget.insertType,
							insertComponentId: state.currentDropTarget.insertComponentId,
							beforeComponentId: state.currentDropTarget.beforeComponentId,
							afterComponentId: state.currentDropTarget.afterComponentId,
							targetRegionId: state.currentDropTarget.regionId,
							targetComponentId: state.currentDropTarget.parentId ?? ""
						});
					} else if (state.componentType) clientApi?.addComponentToRegion({
						insertType: state.currentDropTarget.insertType,
						insertComponentId: state.currentDropTarget.insertComponentId,
						componentProperties: {},
						componentType: state.componentType,
						targetComponentId: state.currentDropTarget.parentId ?? "",
						beforeComponentId: state.currentDropTarget.beforeComponentId,
						afterComponentId: state.currentDropTarget.afterComponentId,
						targetRegionId: state.currentDropTarget.regionId
					});
				}
				scrollFactorRef.current = 0;
				setState((prevState) => ({
					...prevState,
					x: 0,
					y: 0,
					componentType: "",
					scrollDirection: 0,
					sourceComponentId: void 0,
					sourceRegionId: void 0,
					currentDropTarget: null,
					pendingTargetCommit: false
				}));
			}
		})
	});
	useEffect(() => {
		if (dragState.pendingTargetCommit) commitCurrentDropTarget();
	}, [dragState.pendingTargetCommit, commitCurrentDropTarget]);
	useEffect(() => {
		if (dragState.scrollDirection !== 0) {
			const interval = setInterval(() => {
				window.scrollBy(0, scrollFactorRef.current * SCROLL_BASE_AMOUNT_IN_PIXELS);
			}, SCROLL_INTERVAL_IN_MS);
			return () => clearInterval(interval);
		}
		return () => {};
	}, [dragState.scrollDirection, scrollFactorRef]);
	return {
		dragState,
		commitCurrentDropTarget,
		startComponentMove,
		updateComponentMove,
		dropComponent,
		cancelDrag
	};
}

//#endregion
//#region src/design/react/context/DesignStateContext.tsx
const DesignStateContext = React.createContext(null);
const DesignStateProvider = ({ children }) => {
	const selectInteraction = useSelectInteraction();
	const hoverInteraction = useHoverInteraction();
	const deleteInteraction = useDeleteInteraction({
		selectedComponentId: selectInteraction.selectedComponentId,
		setSelectedComponent: selectInteraction.setSelectedComponent
	});
	const focusInteraction = useFocusInteraction({ setSelectedComponent: selectInteraction.setSelectedComponent });
	const nodeToTargetMap = React.useMemo(() => /* @__PURE__ */ new WeakMap(), []);
	const dragInteraction = useDragInteraction({ nodeToTargetMap });
	const state = React.useMemo(() => ({
		...deleteInteraction,
		...selectInteraction,
		...hoverInteraction,
		...focusInteraction,
		...dragInteraction,
		nodeToTargetMap
	}), [
		deleteInteraction,
		selectInteraction,
		hoverInteraction,
		focusInteraction,
		dragInteraction,
		nodeToTargetMap
	]);
	return <DesignStateContext.Provider value={state}>{children}</DesignStateContext.Provider>;
};

//#endregion
//#region src/design/react/hooks/useDesignState.ts
/**
* Custom hook that manages design-time component state by composing
* individual interaction hooks for better maintainability and testability.
*
* @returns Combined design state from all interactions
*/
const useDesignState = () => {
	const context = React.useContext(DesignStateContext);
	if (!context) throw new Error("useDesignState must be used within a DesignStateProvider");
	return context;
};

//#endregion
//#region src/design/react/hooks/useThrottledCallback.ts
function useThrottledCallback(callback, interval, deps = []) {
	const lastCallTime = useRef(0);
	return useCallback((...args) => {
		const now = Date.now();
		if (now >= lastCallTime.current + interval) {
			lastCallTime.current = now;
			callback(...args);
		}
	}, [
		callback,
		interval,
		...deps
	]);
}

//#endregion
//#region src/design/react/hooks/useGlobalDragListener.ts
const FPS_60 = 1e3 / 60;
function useGlobalDragListener() {
	const { dropComponent, updateComponentMove, cancelDrag } = useDesignState();
	const dragListener = useThrottledCallback((event) => updateComponentMove({
		x: event.clientX,
		y: event.clientY
	}), FPS_60, [updateComponentMove]);
	useEffect(() => {
		const dragEndListener = () => dropComponent();
		const mouseUpListener = () => cancelDrag();
		window.addEventListener("dragover", dragListener);
		window.addEventListener("dragend", dragEndListener);
		window.addEventListener("mouseup", mouseUpListener);
		return () => {
			window.removeEventListener("dragover", dragListener);
			window.removeEventListener("dragend", dragEndListener);
			window.removeEventListener("mouseup", mouseUpListener);
		};
	}, [
		dropComponent,
		cancelDrag,
		dragListener
	]);
}

//#endregion
//#region src/design/react/components/DesignApp.tsx
/**
* Containes any global setup logic for the design layer.
*/
const DesignApp = ({ children }) => {
	useGlobalDragListener();
	return <>{children}</>;
};

//#endregion
//#region src/design/react/context/DesignContext.tsx
const noop = () => {};
const DesignContext = React.createContext({
	isDesignMode: false,
	isConnected: false,
	pageDesignerConfig: null
});
/**
* Provider component that enables design-time functionality for child components.
* Sets up client-host communication and manages component selection state.
*
* @param children - Child components to wrap with design functionality
* @param targetOrigin - Target origin for postMessage communication
* @param clientId - Id for the client API
* @returns JSX element wrapping children with design context
*/
const DesignProvider = ({ children, targetOrigin, clientId, clientConnectionTimeout, clientConnectionInterval, clientLogger = noop }) => {
	const { isDesignMode } = usePageDesignerMode();
	const [isConnected, setIsConnected] = React.useState(false);
	const [pageDesignerConfig, setPageDesignerConfig] = React.useState(null);
	const clientApi = React.useMemo(() => createClientApi({
		logger: clientLogger,
		emitter: {
			postMessage: (message) => window.parent.postMessage(message, targetOrigin),
			addEventListener: (handler) => {
				const listener = (event) => handler(event.data);
				window.addEventListener("message", listener);
				return () => window.removeEventListener("message", listener);
			}
		},
		id: clientId
	}), [
		targetOrigin,
		clientId,
		clientLogger
	]);
	React.useEffect(() => {
		clientApi.connect({
			timeout: clientConnectionTimeout,
			interval: clientConnectionInterval,
			onHostConnected: (event) => {
				setPageDesignerConfig(event);
				setIsConnected(true);
			},
			onError: () => {}
		});
		return () => {
			clientApi.disconnect();
			setPageDesignerConfig(null);
			setIsConnected(false);
		};
	}, [
		clientApi,
		clientConnectionTimeout,
		clientConnectionInterval,
		clientLogger
	]);
	const contextValue = React.useMemo(() => ({
		isDesignMode,
		clientApi,
		isConnected,
		pageDesignerConfig
	}), [
		isDesignMode,
		clientApi,
		isConnected,
		pageDesignerConfig
	]);
	return <DesignContext.Provider value={contextValue}>
            <DesignStateProvider>
                <DesignApp>{children}</DesignApp>
            </DesignStateProvider>
        </DesignContext.Provider>;
};
DesignProvider.defaultProps = {
	clientLogger: noop,
	clientConnectionTimeout: 6e4,
	clientConnectionInterval: 1e3
};
/**
* Custom hook to access the design context
* Provides access to design mode state and component selection functionality
*
* @returns The current design context
*/
const useDesignContext = () => React.useContext(DesignContext);

//#endregion
export { isComponentTypeAllowedInRegion as a, usePageDesignerMode as c, useDesignState as i, DesignProvider as n, useComponentDiscovery as o, useDesignContext as r, PageDesignerProvider as s, DesignContext as t };
//# sourceMappingURL=DesignContext-BydCFFcv.js.map