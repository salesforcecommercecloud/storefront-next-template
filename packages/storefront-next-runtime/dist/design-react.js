import "./modeDetection-BZMGik06.js";
import "./client-IwF8G5Dm.js";
import { a as isComponentTypeAllowedInRegion, c as usePageDesignerMode, i as useDesignState, o as useComponentDiscovery, r as useDesignContext, s as PageDesignerProvider } from "./DesignContext-CtmhEgsl.js";
import React, { useCallback, useMemo, useRef } from "react";

//#region src/design/react/hooks/useComponentDecoratorClasses.ts
function useComponentDecoratorClasses({ componentId, isFragment }) {
	const { selectedComponentId, hoveredComponentId, dragState } = useDesignState();
	const isSelected = selectedComponentId === componentId;
	const isHovered = !dragState.isDragging && hoveredComponentId === componentId;
	const showFrame = (isSelected || isHovered) && !dragState.isDragging;
	const isMoving = dragState.isDragging && dragState.sourceComponentId === componentId;
	const isDropTarget = dragState.currentDropTarget?.componentId === componentId && dragState.sourceComponentId !== componentId;
	const dropTargetInsertType = dragState.currentDropTarget?.insertType;
	const dropTargetDirection = dragState.currentDropTarget?.regionDirection;
	return [
		"pd-design__decorator",
		isFragment ? "pd-design__fragment" : "pd-design__component",
		showFrame && "pd-design__frame--visible",
		isSelected && "pd-design__decorator--selected",
		isHovered && "pd-design__decorator--hovered",
		isMoving && "pd-design__decorator--moving",
		isDropTarget && `pd-design__drop-target__${dropTargetDirection === "row" ? "x" : "y"}-${dropTargetInsertType}`
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
function useNodeToTargetStore({ parentId, componentId, regionId, regionDirection, nodeRef, type, componentIds, componentTypeInclusions, componentTypeExclusions }) {
	const { nodeToTargetMap } = useDesignState();
	React.useEffect(() => {
		if (nodeRef.current) nodeToTargetMap.set(nodeRef.current, {
			parentId,
			componentId,
			regionId,
			regionDirection,
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
		componentTypeExclusions,
		regionDirection
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
const DeleteToolboxButton = ({ title, onClick }) => <button className="pd-design__frame__toolbox-button" title={title} type="button" onClick={onClick}>
        <svg className="pd-design__frame__delete-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </button>;

//#endregion
//#region src/design/react/components/MoveToolboxButton.tsx
const MoveToolboxButton = ({ title, onMouseDown }) => <button className="pd-design__frame__toolbox-button" title={title} type="button" onMouseDown={onMouseDown}>
        <svg className="pd-design__frame__move-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.9 11.7l-3.8-4.2c-.3-.3-.6 0-.6.4v2.7h-4.7c-.2 0-.4-.2-.4-.4V5.5h2.7c.5 0 .7-.4.4-.6l-4.1-3.8c-.2-.2-.5-.2-.7 0L7.6 4.9c-.3.3-.1.6.4.6h2.6v4.7c0 .2-.2.4-.4.4H5.5V7.9c0-.5-.4-.7-.6-.4l-3.8 4.1c-.2.2-.2.5 0 .7l3.8 4.1c.3.3.6.1.6-.4v-2.6h4.7c.2 0 .4.2.4.4v4.7H7.9c-.5 0-.7.4-.4.6l4.1 3.8c.2.2.5.2.7 0l4.1-3.8c.3-.3.1-.6-.4-.6h-2.6v-4.7c0-.2.2-.4.4-.4h4.7v2.7c0 .5.4.7.6.4l3.8-4.1c.2-.3.2-.5 0-.7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </button>;

//#endregion
//#region src/design/react/hooks/useLabels.ts
function useLabels() {
	const { pageDesignerConfig } = useDesignContext();
	return pageDesignerConfig?.labels ?? {};
}

//#endregion
//#region src/design/react/components/DesignFrame.tsx
const DesignFrame = ({ componentId, children, name, parentId, regionId, showFrame = false, showToolbox = true }) => {
	const componentType = useComponentType(componentId ?? "");
	const { deleteComponent, startComponentMove } = useDesignState();
	const labels = useLabels();
	const nodeRef = React.useRef(null);
	const handleDelete = React.useCallback(() => componentId && deleteComponent({
		componentId,
		sourceComponentId: parentId ?? "",
		sourceRegionId: regionId ?? ""
	}), [
		deleteComponent,
		componentId,
		parentId,
		regionId
	]);
	const handleMouseDown = React.useCallback(() => {
		if (componentId && regionId) startComponentMove(componentId, regionId);
	}, [
		componentId,
		regionId,
		startComponentMove
	]);
	const classes = `pd-design__frame ${showFrame ? "pd-design__frame--visible" : ""}`.trim();
	return <div className={classes} ref={nodeRef}>
            {showFrame && <>
                    <div className="pd-design__frame--x" />
                    <div className="pd-design__frame--y" />
                </>}
            <div className="pd-design__frame__label">
                {componentType?.image && <span className="pd-design__icon">
                        <img src={componentType.image} alt="" />
                    </span>}
                <span className="pd-design__frame__name">{name}</span>
            </div>
            {showToolbox && <div className="pd-design__frame__toolbox">
                    <MoveToolboxButton title={labels.moveComponent ?? "Move component"} onMouseDown={handleMouseDown} />
                    <DeleteToolboxButton title={labels.deleteComponent ?? "Delete component"} onClick={handleDelete} />
                </div>}
            {children}
        </div>;
};
DesignFrame.defaultProps = {
	parentId: void 0,
	componentId: void 0,
	showToolbox: true,
	regionId: void 0,
	showFrame: false
};

//#endregion
//#region src/design/react/context/RegionContext.tsx
const RegionContext = React.createContext(null);
const useRegionContext = () => React.useContext(RegionContext);

//#endregion
//#region src/design/react/context/ComponentContext.tsx
const ComponentContext = React.createContext(null);
const useComponentContext = () => React.useContext(ComponentContext);

//#endregion
//#region src/design/react/components/DesignComponent.tsx
function DesignComponent(props) {
	const { designMetadata, children } = props;
	const { id, name, isFragment } = designMetadata;
	const componentId = id;
	const componentName = useComponentType(componentId)?.label || name || "Component";
	const dragRef = useRef(null);
	const { regionId, regionDirection } = useRegionContext() ?? {};
	const { componentId: parentComponentId } = useComponentContext() ?? {};
	const { nodeToTargetMap } = useDesignState();
	const { selectedComponentId, hoveredComponentId, setSelectedComponent, setHoveredComponent, dragState: { isDragging, sourceComponentId: draggingSourceComponentId } } = useDesignState();
	const isDraggingComponent = isDragging && draggingSourceComponentId === componentId;
	useFocusedComponentHandler(componentId, dragRef);
	useNodeToTargetStore({
		type: "component",
		nodeRef: dragRef,
		parentId: parentComponentId,
		regionId,
		regionDirection,
		componentId
	});
	const discoverComponents = useComponentDiscovery({ nodeToTargetMap });
	const handleMouseEnter = useCallback(() => setHoveredComponent(componentId), [setHoveredComponent, componentId]);
	const handleMouseLeave = useCallback((event) => {
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
	const classes = useComponentDecoratorClasses({
		componentId,
		isFragment: Boolean(isFragment)
	});
	const context = React.useMemo(() => ({
		componentId: id,
		name
	}), [id, name]);
	const handleDragOver = React.useCallback((event) => {
		if (draggingSourceComponentId !== componentId) event.preventDefault();
	}, [draggingSourceComponentId, componentId]);
	return <div ref={dragRef} className={classes} draggable={isDraggingComponent} onClick={handleClick} onDragOver={handleDragOver} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="pd-design__component__drop-target" />
            <DesignFrame showFrame={showFrame} componentId={componentId} name={componentName} parentId={parentComponentId} regionId={regionId}>
                <ComponentContext.Provider value={context}>{children}</ComponentContext.Provider>
            </DesignFrame>
        </div>;
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
		const { designMetadata, children,...componentProps } = props;
		const { isDesignMode } = usePageDesignerMode();
		return isDesignMode ? <DesignComponent designMetadata={designMetadata}>
                <Component {...componentProps}>{children}</Component>
            </DesignComponent> : <Component {...componentProps}>{children}</Component>;
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
	const { name, regionDirection = "column", id, componentIds, componentTypeInclusions, componentTypeExclusions } = designMetadata;
	const nodeRef = React.useRef(null);
	const classes = useRegionDecoratorClasses({
		regionId: id,
		componentTypeInclusions,
		componentTypeExclusions
	});
	const { dragState: { currentDropTarget } } = useDesignState();
	const labels = useLabels();
	const showFrame = Boolean(id && currentDropTarget?.regionId === id);
	const { componentId: parentComponentId } = useComponentContext() ?? {};
	const { dragState } = useDesignState();
	useNodeToTargetStore({
		type: "region",
		nodeRef,
		parentId: parentComponentId,
		componentIds,
		componentId: parentComponentId ?? "",
		regionId: id,
		regionDirection,
		componentTypeInclusions,
		componentTypeExclusions
	});
	const context = React.useMemo(() => ({
		regionId: id,
		regionDirection,
		componentIds
	}), [
		id,
		regionDirection,
		componentIds
	]);
	const handleDragOver = useCallback((event) => {
		if (isComponentTypeAllowedInRegion(dragState.componentType, componentTypeInclusions, componentTypeExclusions)) event.preventDefault();
	}, [
		dragState.componentType,
		componentTypeInclusions,
		componentTypeExclusions
	]);
	return <div className={classes} ref={nodeRef} onDragOver={handleDragOver} data-region-id={id}>
            <DesignFrame name={name ?? labels.defaultRegionName ?? "Region"} parentId={parentComponentId} regionId={id} showFrame={showFrame} showToolbox={false}>
                <RegionContext.Provider value={context}>{children}</RegionContext.Provider>
            </DesignFrame>
        </div>;
}

//#endregion
//#region src/design/react/components/RegionDecorator.tsx
function createReactRegionDesignDecorator(Region) {
	return function DesignDecoratedRegion(props) {
		const { designMetadata, children,...componentProps } = props;
		const { isDesignMode } = usePageDesignerMode();
		return isDesignMode ? <DesignRegion designMetadata={designMetadata}>
                <Region {...componentProps}>{children}</Region>
            </DesignRegion> : <Region {...componentProps}>{children}</Region>;
	};
}

//#endregion
export { PageDesignerProvider, createReactComponentDesignDecorator, createReactRegionDesignDecorator, useDesignContext, usePageDesignerMode };
//# sourceMappingURL=design-react.js.map