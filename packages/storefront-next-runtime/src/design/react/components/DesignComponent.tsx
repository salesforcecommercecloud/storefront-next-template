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
import { useRegionContext } from '../context/RegionContext';
import { ComponentContext, useComponentContext, type ComponentContextType } from '../context/ComponentContext';
import { useComponentDiscovery } from '../hooks/useComponentDiscovery';
import { useComponentType } from '../hooks/useComponentType';

export function DesignComponent(props: ComponentDecoratorProps<unknown>): React.JSX.Element {
    const { designMetadata, children } = props;
    const { id, name, isFragment } = designMetadata;
    const componentId = id;
    const componentType = useComponentType(componentId);
    const componentName = componentType?.label || name || 'Component';
    const dragRef = useRef<HTMLDivElement>(null);
    const { regionId, regionDirection } = useRegionContext() ?? {};
    const { componentId: parentComponentId } = useComponentContext() ?? {};
    const { nodeToTargetMap } = useDesignState();

    const {
        selectedComponentId,
        hoveredComponentId,
        setSelectedComponent,
        setHoveredComponent,
        dragState: { isDragging, sourceComponentId: draggingSourceComponentId },
    } = useDesignState();

    const isDraggingComponent = isDragging && draggingSourceComponentId === componentId;

    useFocusedComponentHandler(componentId, dragRef);
    useNodeToTargetStore({
        type: 'component',
        nodeRef: dragRef,
        parentId: parentComponentId,
        regionId,
        regionDirection,
        componentId,
    });

    const discoverComponents = useComponentDiscovery({
        nodeToTargetMap,
    });

    const handleMouseEnter = useCallback(() => setHoveredComponent(componentId), [setHoveredComponent, componentId]);

    const handleMouseLeave = useCallback(
        (event: React.MouseEvent) => {
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

    const classes = useComponentDecoratorClasses({
        componentId,
        isFragment: Boolean(isFragment),
    });

    const context = React.useMemo<ComponentContextType>(() => ({ componentId: id, name }), [id, name]);

    // Makes the component a drop target.
    const handleDragOver = React.useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            // If we are moving a component, don't let it be droppable on itself.
            if (draggingSourceComponentId !== componentId) {
                event.preventDefault();
            }
        },
        [draggingSourceComponentId, componentId]
    );

    return (
        <div
            ref={dragRef}
            className={classes}
            draggable={isDraggingComponent}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            <div className="pd-design__component__drop-target" />
            <DesignFrame
                showFrame={showFrame}
                componentId={componentId}
                name={componentName}
                parentId={parentComponentId}
                regionId={regionId}>
                <ComponentContext.Provider value={context}>{children}</ComponentContext.Provider>
            </DesignFrame>
        </div>
    );
}
