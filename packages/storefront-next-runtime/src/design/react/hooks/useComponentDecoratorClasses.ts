/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useDesignState } from './useDesignState';

export function useComponentDecoratorClasses({
    componentId,
    isFragment,
}: {
    componentId: string;
    isFragment: boolean;
}): string {
    const { selectedComponentId, hoveredComponentId, dragState } = useDesignState();

    const isSelected = selectedComponentId === componentId;
    const isHovered = !dragState.isDragging && hoveredComponentId === componentId;
    const showFrame = (isSelected || isHovered) && !dragState.isDragging;
    const isMoving = dragState.isDragging && dragState.sourceComponentId === componentId;
    const isDropTarget =
        dragState.currentDropTarget?.componentId === componentId &&
        // We don't want to show the drop target if we are moving a component to itself.
        dragState.sourceComponentId !== componentId;
    const dropTargetInsertType = dragState.currentDropTarget?.insertType;
    const dropTargetAxis = dropTargetInsertType?.axis;

    return [
        'pd-design__decorator',
        isFragment ? 'pd-design__fragment' : 'pd-design__component',
        showFrame && 'pd-design__frame--visible',
        isSelected && 'pd-design__decorator--selected',
        isHovered && 'pd-design__decorator--hovered',
        isMoving && 'pd-design__decorator--moving',
        isDropTarget &&
            dropTargetAxis &&
            dropTargetInsertType &&
            `pd-design__drop-target__${dropTargetAxis}-${dropTargetInsertType.type}`,
    ]
        .filter(Boolean)
        .join(' ');
}
