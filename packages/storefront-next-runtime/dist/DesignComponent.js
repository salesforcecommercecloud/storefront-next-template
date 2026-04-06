import "./messaging-api.js";
import { a as useDesignState, i as useThrottledCallback, s as useComponentDiscovery } from "./DesignContext.js";
import "./modeDetection.js";
import "./PageDesignerProvider.js";
import { i as useRegionContext, n as useComponentContext, t as ComponentContext } from "./ComponentContext.js";
import { i as useNodeToTargetStore, r as useComponentType, t as DesignFrame } from "./DesignFrame.js";
import React, { useCallback, useRef } from "react";
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
//#region src/design/react/components/DesignComponent.tsx
function DesignComponent(props) {
	const { designMetadata, children } = props;
	const { id = "", name, isFragment = false, isVisible = true, isLocalized = false } = designMetadata ?? {};
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
	const findAndSetHoveredComponent = useCallback((x, y) => {
		setHoveredComponent(discoverComponents({
			x,
			y,
			filter: (entry) => entry.type === "component"
		})[0]?.componentId ?? null);
	}, [setHoveredComponent, discoverComponents]);
	const handleMouseMove = useThrottledCallback((event) => {
		event.stopPropagation();
		findAndSetHoveredComponent(event.clientX, event.clientY);
	}, 1e3 / 60, [findAndSetHoveredComponent]);
	const handleMouseLeave = useCallback((event) => {
		event.stopPropagation();
		findAndSetHoveredComponent(event.clientX, event.clientY);
	}, [findAndSetHoveredComponent]);
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
		onMouseMove: handleMouseMove,
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
export { DesignComponent };
//# sourceMappingURL=DesignComponent.js.map