import { a as isComponentTypeAllowedInRegion, i as useDesignState, o as useComponentDiscovery, r as useDesignContext } from "./DesignContext.js";
import { n as usePageDesignerMode } from "./PageDesignerProvider.js";
import { i as useRegionContext, n as useComponentContext, r as RegionContext, t as ComponentContext } from "./ComponentContext.js";
import React, { useCallback, useMemo, useRef } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

//#region src/design/react/hooks/useComponentDecoratorClasses.ts
function useComponentDecoratorClasses({ componentId, isFragment, isLocalized }) {
	const { selectedComponentId, hoveredComponentId, dragState } = useDesignState();
	const isSelected = selectedComponentId === componentId;
	const isHovered = !dragState.isDragging && hoveredComponentId === componentId;
	const showFrame = (isSelected || isHovered) && !dragState.isDragging;
	const isMoving = dragState.isDragging && dragState.sourceComponentId === componentId;
	const isDropTarget = dragState.currentDropTarget?.componentId === componentId;
	const dropTargetInsertType = dragState.currentDropTarget?.insertType;
	const dropTargetAxis = dropTargetInsertType?.axis;
	return [
		"pd-design__decorator",
		isFragment ? "pd-design__fragment" : "pd-design__component",
		showFrame && "pd-design__frame--visible",
		isSelected && "pd-design__decorator--selected",
		isHovered && "pd-design__decorator--hovered",
		isMoving && "pd-design__decorator--moving",
		!isLocalized && "pd-design__component--unlocalized",
		isDropTarget && dropTargetAxis && dropTargetInsertType && `pd-design__drop-target__${dropTargetAxis}-${dropTargetInsertType.type}`
	].filter(Boolean).join(" ");
}

//#endregion
//#region src/design/react/hooks/useFocusedComponentHandler.ts
/**
* Focuses a component when the focused component id matches the component id.
* @param componentId - The id of the component to focus.
* @param nodeRef - The ref object to the node to focus.
*/
function useFocusedComponentHandler(componentId, nodeRef) {
	const { focusedComponentId, focusComponent } = useDesignState();
	React.useEffect(() => {
		if (focusedComponentId === componentId && nodeRef.current) focusComponent(nodeRef.current);
	}, [
		focusedComponentId,
		componentId,
		focusComponent,
		nodeRef
	]);
}

//#endregion
//#region src/design/react/hooks/useNodeToTargetStore.ts
function useNodeToTargetStore({ parentId, componentId, regionId, nodeRef, type, componentIds, componentTypeInclusions, componentTypeExclusions }) {
	const { nodeToTargetMap } = useDesignState();
	React.useEffect(() => {
		if (nodeRef.current) nodeToTargetMap.set(nodeRef.current, {
			parentId,
			componentId,
			regionId,
			type,
			componentIds,
			componentTypeInclusions,
			componentTypeExclusions
		});
	}, [
		nodeRef,
		parentId,
		componentId,
		regionId,
		type,
		componentIds,
		nodeToTargetMap,
		componentTypeInclusions,
		componentTypeExclusions
	]);
}

//#endregion
//#region src/design/react/hooks/useComponentType.ts
function useComponentType(componentId) {
	const { pageDesignerConfig } = useDesignContext();
	const { type = "" } = pageDesignerConfig?.components[componentId] ?? {};
	return pageDesignerConfig?.componentTypes[type] ?? null;
}

//#endregion
//#region src/design/react/components/DeleteToolboxButton.tsx
const DeleteToolboxButton = ({ title, onClick, onMouseDown = () => {} }) => /* @__PURE__ */ jsx("button", {
	className: "pd-design__frame__toolbox-button",
	title,
	type: "button",
	onMouseDown,
	onClick,
	children: /* @__PURE__ */ jsx("svg", {
		className: "pd-design__frame__delete-icon",
		viewBox: "0 0 24 24",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		children: /* @__PURE__ */ jsx("path", {
			d: "M18 6L6 18M6 6l12 12",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		})
	})
});

//#endregion
//#region src/design/react/components/MoveToolboxButton.tsx
const MoveToolboxButton = ({ title }) => /* @__PURE__ */ jsx("button", {
	className: "pd-design__frame__toolbox-button",
	title,
	type: "button",
	children: /* @__PURE__ */ jsx("svg", {
		className: "pd-design__frame__move-icon",
		viewBox: "0 0 24 24",
		xmlns: "http://www.w3.org/2000/svg",
		children: /* @__PURE__ */ jsx("path", {
			d: "M22.9 11.7l-3.8-4.2c-.3-.3-.6 0-.6.4v2.7h-4.7c-.2 0-.4-.2-.4-.4V5.5h2.7c.5 0 .7-.4.4-.6l-4.1-3.8c-.2-.2-.5-.2-.7 0L7.6 4.9c-.3.3-.1.6.4.6h2.6v4.7c0 .2-.2.4-.4.4H5.5V7.9c0-.5-.4-.7-.6-.4l-3.8 4.1c-.2.2-.2.5 0 .7l3.8 4.1c.3.3.6.1.6-.4v-2.6h4.7c.2 0 .4.2.4.4v4.7H7.9c-.5 0-.7.4-.4.6l4.1 3.8c.2.2.5.2.7 0l4.1-3.8c.3-.3.1-.6-.4-.6h-2.6v-4.7c0-.2.2-.4.4-.4h4.7v2.7c0 .5.4.7.6.4l3.8-4.1c.2-.3.2-.5 0-.7z",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		})
	})
});

//#endregion
//#region src/design/react/hooks/useLabels.ts
function useLabels() {
	const { pageDesignerConfig } = useDesignContext();
	return pageDesignerConfig?.labels ?? {};
}

//#endregion
//#region src/design/react/components/DesignOverlay.tsx
const DesignOverlay = () => {
	return /* @__PURE__ */ jsx("div", {
		className: "pd-design__frame__overlay",
		children: /* @__PURE__ */ jsx("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			x: "0px",
			y: "0px",
			width: "52px",
			height: "52px",
			viewBox: "0 0 52 52",
			enableBackground: "new 0 0 52 52",
			xmlSpace: "preserve",
			children: /* @__PURE__ */ jsx("path", {
				fill: "#FFFFFF",
				d: "M26,2C12.7,2,2,12.7,2,26s10.7,24,24,24s24-10.7,24-24S39.3,2,26,2z M26,7C26,7,26,7,26,7C26,7,26,7,26,7\n	C26,7,26,7,26,7z M28,7.1c-0.1,0-0.1,0-0.2,0C27.9,7.1,28,7.1,28,7.1z M26,45C15.5,45,7,36.5,7,26c0-1,0.1-2.1,0.3-3\n	c1.3,0.2,2.9,0.7,3.7,1.5c1.7,1.8,3.6,3.9,5.4,4.3c0,0-0.2,0.1-0.4,0.4c-0.2,0.3-0.4,0.9-0.4,1.9c0,4.7,4.4,1.9,4.4,6.6\n	c0,4.7,5.3,6.6,5.3,2.8s3.5-5.6,3.5-8.5s-2.7-2.8-4.4-3.8c-1.8-0.9-2.7-2.4-6.1-1.9c-1.8-1.7-2.8-3.1-2-4.7c0.9-1.7,4.6-2,4.6-4.6\n	s-2.5-3.1-4.3-3.1c-0.8,0-2.5-0.6-3.9-1.3c1.7-1.7,3.8-3.1,6-4.1c1.6,0.7,4.3,1.8,6.6,1.8c2.7,0,4.1-1.9,3.7-3.1\n	c4.5,0.7,8.5,3,11.4,6.2c-1.5,0.9-3.5,1.9-7,1.9c-4.6,0-4.6,4.7-1.9,5.6c2.8,0.9,5.6-1.8,6.5,0c0.9,1.8-6.5,1.8-4.6,6.4\n	c1.9,4.6,3.7-0.1,5.6,4.5c1.9,4.6,5.6-0.7,2.8-4.3c-1.2-1.6-0.9-6.5,1.9-6.5h0.9c0.4,1.6,0.7,3.3,0.7,5C45,36.5,36.5,45,26,45z"
			})
		})
	});
};

//#endregion
//#region src/design/react/components/DesignFrame.tsx
const DesignFrame = ({ componentId, children, name, parentId, regionId, localized = false, showFrame = false, showToolbox = true, isMoveable = true }) => {
	const componentType = useComponentType(componentId ?? "");
	const { deleteComponent } = useDesignState();
	const labels = useLabels();
	const nodeRef = React.useRef(null);
	const handleDelete = React.useCallback((event) => {
		event.stopPropagation();
		if (componentId) deleteComponent({
			componentId,
			sourceComponentId: parentId ?? "",
			sourceRegionId: regionId ?? ""
		});
	}, [
		deleteComponent,
		componentId,
		parentId,
		regionId
	]);
	const stopPropagation = (event) => event.stopPropagation();
	return /* @__PURE__ */ jsxs("div", {
		className: ["pd-design__frame", showFrame && "pd-design__frame--visible"].filter(Boolean).join(" "),
		ref: nodeRef,
		children: [
			showFrame && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", { className: "pd-design__frame--x" }), /* @__PURE__ */ jsx("div", { className: "pd-design__frame--y" })] }),
			/* @__PURE__ */ jsxs("div", {
				className: "pd-design__frame__label",
				onMouseDown: stopPropagation,
				children: [
					componentType?.image && /* @__PURE__ */ jsx("span", {
						className: "pd-design__icon",
						children: /* @__PURE__ */ jsx("img", {
							src: componentType.image,
							alt: ""
						})
					}),
					/* @__PURE__ */ jsx("span", {
						className: "pd-design__frame__name",
						children: name
					}),
					!localized && /* @__PURE__ */ jsx("span", {
						className: "pd-design__frame__fallback-badge",
						children: labels.fallback ?? "Fallback"
					})
				]
			}),
			showToolbox && /* @__PURE__ */ jsxs("div", {
				className: "pd-design__frame__toolbox",
				children: [isMoveable && /* @__PURE__ */ jsx(MoveToolboxButton, { title: labels.moveComponent ?? "Move component" }), /* @__PURE__ */ jsx(DeleteToolboxButton, {
					title: labels.deleteComponent ?? "Delete component",
					onMouseDown: stopPropagation,
					onClick: handleDelete
				})]
			}),
			/* @__PURE__ */ jsx(DesignOverlay, {}),
			children
		]
	});
};
DesignFrame.defaultProps = {
	parentId: void 0,
	componentId: void 0,
	showToolbox: true,
	regionId: void 0,
	showFrame: false
};

//#endregion
//#region src/design/react/components/DesignComponent.tsx
function DesignComponent(props) {
	const { designMetadata, children } = props;
	const { id, name, isFragment, isVisible, isLocalized } = designMetadata;
	const componentId = id;
	const componentType = useComponentType(componentId);
	const componentName = componentType?.label || name || "Component";
	const dragRef = useRef(null);
	const { regionId } = useRegionContext() ?? {};
	const { componentId: parentComponentId } = useComponentContext() ?? {};
	const { nodeToTargetMap } = useDesignState();
	const { selectedComponentId, hoveredComponentId, setSelectedComponent, setHoveredComponent, startComponentMove, setPendingComponentDragId, dragState: { pendingComponentDragId, isDragging, sourceComponentId: draggingSourceComponentId } } = useDesignState();
	useFocusedComponentHandler(componentId, dragRef);
	useNodeToTargetStore({
		type: "component",
		nodeRef: dragRef,
		parentId: parentComponentId,
		regionId,
		componentId
	});
	const discoverComponents = useComponentDiscovery({ nodeToTargetMap });
	const isPendingDrag = pendingComponentDragId === componentId;
	const handleMouseEnter = useCallback((event) => {
		event.stopPropagation();
		setHoveredComponent(componentId);
	}, [setHoveredComponent, componentId]);
	const handleMouseLeave = useCallback((event) => {
		event.stopPropagation();
		setHoveredComponent(discoverComponents({
			x: event.clientX,
			y: event.clientY,
			filter: (entry) => entry.type === "component"
		})[0]?.componentId ?? null);
	}, [setHoveredComponent, discoverComponents]);
	const handleClick = useCallback((e) => {
		e.stopPropagation();
		setSelectedComponent(componentId);
	}, [setSelectedComponent, componentId]);
	const showFrame = [selectedComponentId, hoveredComponentId].includes(componentId) && !isDragging;
	const isDraggable = Boolean(componentId && regionId && componentType?.id);
	const classes = useComponentDecoratorClasses({
		componentId,
		isLocalized,
		isFragment: Boolean(isFragment)
	});
	const context = React.useMemo(() => ({
		componentId: id,
		name
	}), [id, name]);
	const handleDragOver = React.useCallback((event) => {
		if (draggingSourceComponentId !== componentId) event.preventDefault();
	}, [draggingSourceComponentId, componentId]);
	const handleMouseDown = React.useCallback((event) => {
		if (componentId) {
			event.stopPropagation();
			setPendingComponentDragId(componentId);
		}
	}, [componentId, setPendingComponentDragId]);
	const handleDragStart = React.useCallback((event) => {
		event.stopPropagation();
		if (componentId && regionId && componentType?.id) startComponentMove(componentId, regionId, componentType.id);
	}, [
		componentId,
		regionId,
		componentType?.id,
		startComponentMove
	]);
	if (!isVisible) return /* @__PURE__ */ jsx(Fragment, {});
	return /* @__PURE__ */ jsxs("div", {
		ref: dragRef,
		className: classes,
		draggable: isPendingDrag && isDraggable,
		onClick: handleClick,
		onDragOver: handleDragOver,
		onDragStart: handleDragStart,
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
		onMouseDown: handleMouseDown,
		"data-component-type": componentType?.id,
		"data-testid": `design-component-${componentId}`,
		children: [/* @__PURE__ */ jsx("div", { className: "pd-design__component__drop-target" }), /* @__PURE__ */ jsx(DesignFrame, {
			showFrame,
			componentId,
			localized: isLocalized,
			name: componentName,
			parentId: parentComponentId,
			isMoveable: isDraggable,
			regionId,
			children: /* @__PURE__ */ jsx(ComponentContext.Provider, {
				value: context,
				children
			})
		})]
	});
}

//#endregion
//#region src/design/react/components/ComponentDecorator.tsx
/**
* Creates a higher-order component that wraps React components with design-time functionality.
* In design mode, adds visual indicators, selection handling, and host communication.
* In normal mode, renders the component unchanged for optimal performance.
*
* @template TProps - The props type of the component being decorated
* @param Component - The React component to wrap with design functionality
* @returns A new component with design-time capabilities
*/
function createReactComponentDesignDecorator(Component) {
	return function DesignDecoratedComponent(props) {
		const { designMetadata, children, ...componentProps } = props;
		const { isDesignMode } = usePageDesignerMode();
		return isDesignMode ? /* @__PURE__ */ jsx(DesignComponent, {
			designMetadata,
			children: /* @__PURE__ */ jsx(Component, {
				...componentProps,
				children
			})
		}) : /* @__PURE__ */ jsx(Component, {
			...componentProps,
			children
		});
	};
}

//#endregion
//#region src/design/react/hooks/useRegionDecoratorClasses.ts
function useRegionDecoratorClasses({ regionId, componentTypeInclusions, componentTypeExclusions }) {
	const { dragState: { currentDropTarget, componentType } } = useDesignState();
	const isHovered = regionId && currentDropTarget?.regionId === regionId;
	const isComponentAllowed = useMemo(() => isComponentTypeAllowedInRegion(componentType, componentTypeInclusions, componentTypeExclusions), [
		componentType,
		componentTypeInclusions,
		componentTypeExclusions
	]);
	return [
		"pd-design__decorator",
		"pd-design__region",
		isHovered && isComponentAllowed && "pd-design__region--hovered pd-design__frame--visible"
	].filter(Boolean).join(" ");
}

//#endregion
//#region src/design/react/components/DesignRegion.tsx
function DesignRegion(props) {
	const { designMetadata, children } = props;
	const { name, id, componentIds, componentTypeInclusions, componentTypeExclusions } = designMetadata;
	const nodeRef = React.useRef(null);
	const classes = useRegionDecoratorClasses({
		regionId: id,
		componentTypeInclusions,
		componentTypeExclusions
	});
	const { dragState } = useDesignState();
	const labels = useLabels();
	const showFrame = Boolean(id && dragState.currentDropTarget?.regionId === id);
	const { componentId: parentComponentId } = useComponentContext() ?? {};
	useNodeToTargetStore({
		type: "region",
		nodeRef,
		parentId: parentComponentId,
		componentIds,
		componentId: parentComponentId ?? "",
		regionId: id,
		componentTypeInclusions,
		componentTypeExclusions
	});
	const context = React.useMemo(() => ({
		regionId: id,
		componentIds
	}), [id, componentIds]);
	return /* @__PURE__ */ jsx("div", {
		className: classes,
		ref: nodeRef,
		onDragOver: useCallback((event) => {
			if (isComponentTypeAllowedInRegion(dragState.componentType, componentTypeInclusions, componentTypeExclusions)) event.preventDefault();
		}, [
			dragState.componentType,
			componentTypeInclusions,
			componentTypeExclusions
		]),
		"data-region-id": id,
		children: /* @__PURE__ */ jsx(DesignFrame, {
			name: name ?? labels.defaultRegionName ?? "Region",
			parentId: parentComponentId,
			regionId: id,
			localized: true,
			showFrame,
			showToolbox: false,
			children: /* @__PURE__ */ jsx(RegionContext.Provider, {
				value: context,
				children
			})
		})
	});
}

//#endregion
//#region src/design/react/components/RegionDecorator.tsx
function createReactRegionDesignDecorator(Region) {
	return function DesignDecoratedRegion(props) {
		const { designMetadata, children, ...componentProps } = props;
		const { isDesignMode } = usePageDesignerMode();
		return isDesignMode ? /* @__PURE__ */ jsx(DesignRegion, {
			designMetadata,
			children: /* @__PURE__ */ jsx(Region, {
				...componentProps,
				children
			})
		}) : /* @__PURE__ */ jsx(Region, {
			...componentProps,
			children
		});
	};
}

//#endregion
//#region src/design/react/registry/adapter.ts
/**
* React framework adapter that implements React-specific behavior
* for the framework-agnostic component registry.
*/
var ReactAdapter = class {
	/**
	* Creates a React lazy component from an importer function.
	*/
	createLazyComponent(importer) {
		return React.lazy(async () => {
			return { default: (await importer()).default };
		});
	}
	/**
	* Decorates a React component with design-time capabilities.
	* Uses the React-specific design decorator directly.
	*/
	decorateComponent(component) {
		return createReactComponentDesignDecorator(component);
	}
};
/**
* Creates a React adapter instance with optional configuration.
*/
function createReactAdapter() {
	return new ReactAdapter();
}

//#endregion
export { createReactAdapter, createReactComponentDesignDecorator, createReactRegionDesignDecorator, useDesignContext };
//# sourceMappingURL=design-react.js.map