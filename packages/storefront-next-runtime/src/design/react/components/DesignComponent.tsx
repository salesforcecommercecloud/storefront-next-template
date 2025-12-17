/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, { useRef, useCallback } from 'react';
import type { ComponentDecoratorProps } from './component.types';
import { useComponentDecoratorClasses } from '../hooks/useComponentDecoratorClasses';
import { useDesignState } from '../hooks/useDesignState';
import { useFocusedComponentHandler } from '../hooks/useFocusedComponentHandler';
import { useNodeToTargetStore } from '../hooks/useNodeToTargetStore';
import { DesignFrame } from './DesignFrame';
import { useRegionContext } from '../core/RegionContext';
import { ComponentContext, useComponentContext, type ComponentContextType } from '../core/ComponentContext';
import { useComponentDiscovery } from '../hooks/useComponentDiscovery';
import { useComponentType } from '../hooks/useComponentType';

export function DesignComponent(props: ComponentDecoratorProps<unknown>): React.JSX.Element {
    const { designMetadata, children } = props;
    const { id, name, isFragment, isVisible, isLocalized } = designMetadata;
    const componentId = id;
    const componentType = useComponentType(componentId);
    const componentName = componentType?.label || name || 'Component';
    const dragRef = useRef<HTMLDivElement>(null);
    const { regionId } = useRegionContext() ?? {};
    const { componentId: parentComponentId } = useComponentContext() ?? {};
    const { nodeToTargetMap } = useDesignState();

    const {
        selectedComponentId,
        hoveredComponentId,
        setSelectedComponent,
        setHoveredComponent,
        startComponentMove,
        setPendingComponentDragId,
        dragState: { pendingComponentDragId, isDragging, sourceComponentId: draggingSourceComponentId },
    } = useDesignState();

    useFocusedComponentHandler(componentId, dragRef);
    useNodeToTargetStore({
        type: 'component',
        nodeRef: dragRef,
        parentId: parentComponentId,
        regionId,
        componentId,
    });

    const discoverComponents = useComponentDiscovery({
        nodeToTargetMap,
    });

    const isPendingDrag = pendingComponentDragId === componentId;

    const handleMouseEnter = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            setHoveredComponent(componentId);
        },
        [setHoveredComponent, componentId]
    );

    const handleMouseLeave = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();

            // If we hover off a component, we could still be hovering over a parent component
            // that contains that child. In this instance, the mouse enter doesn't fire and that parent
            // would not be highlighted. Everytime we leave a component, we check
            // if we are hovering over a component at those coordinates. If we are,
            // we set the hovered component to that component.
            const components = discoverComponents({
                x: event.clientX,
                y: event.clientY,
                filter: (entry) => entry.type === 'component',
            });

            setHoveredComponent(components[0]?.componentId ?? null);
        },
        [setHoveredComponent, discoverComponents]
    );

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedComponent(componentId);
        },
        [setSelectedComponent, componentId]
    );

    const showFrame = [selectedComponentId, hoveredComponentId].includes(componentId) && !isDragging;
    const isDraggable = Boolean(componentId && regionId && componentType?.id);

    const classes = useComponentDecoratorClasses({
        componentId,
        isLocalized,
        isFragment: Boolean(isFragment),
    });

    const context = React.useMemo<ComponentContextType>(() => ({ componentId: id, name }), [id, name]);

    // Makes the component a drop target.
    const handleDragOver = React.useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            // Don't prevent propagation here.
            // We depend on the global listener to handle the drag over event.
            // If we are moving a component, don't let it be droppable on itself.
            if (draggingSourceComponentId !== componentId) {
                event.preventDefault();
            }
        },
        [draggingSourceComponentId, componentId]
    );

    // When dragging, we don't consider the component as dragging until the drag start event
    // is triggered. However, we need to mark the component as draggable on mouse down so that
    // it can even be dragged via the native drag and drop API.
    //
    // If we were to mark the components as dragging on mouse down instead, a selection of a component
    // would first remove the frame because this thinks we are dragging the component instead of selecting it.
    // This is why it is split up into two events.
    const handleMouseDown = React.useCallback(
        (event: React.MouseEvent) => {
            if (componentId) {
                event.stopPropagation();
                setPendingComponentDragId(componentId);
            }
        },
        [componentId, setPendingComponentDragId]
    );

    const handleDragStart = React.useCallback(
        (event: React.DragEvent) => {
            event.stopPropagation();

            if (componentId && regionId && componentType?.id) {
                startComponentMove(componentId, regionId, componentType.id);
            }
        },
        [componentId, regionId, componentType?.id, startComponentMove]
    );

    // Don't render anything if the components is hidden via visibility rules.
    // We still want the component to be reactive in case the use changes the
    // visibility rules or the render context.
    if (!isVisible) {
        return <></>;
    }

    return (
        <div
            ref={dragRef}
            className={classes}
            draggable={isPendingDrag && isDraggable}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            data-component-type={componentType?.id}
            data-testid={`design-component-${componentId}`}>
            <div className="pd-design__component__drop-target" />
            <DesignFrame
                showFrame={showFrame}
                componentId={componentId}
                localized={isLocalized}
                name={componentName}
                parentId={parentComponentId}
                isMoveable={isDraggable}
                regionId={regionId}>
                <ComponentContext.Provider value={context}>{children}</ComponentContext.Provider>
            </DesignFrame>
        </div>
    );
}
