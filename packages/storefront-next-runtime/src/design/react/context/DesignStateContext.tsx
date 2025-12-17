/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React from 'react';
import { useSelectInteraction } from '../hooks/useSelectInteraction';
import { useHoverInteraction } from '../hooks/useHoverInteraction';
import { useDeleteInteraction } from '../hooks/useDeleteInteraction';
import { useFocusInteraction } from '../hooks/useFocusInteraction';
import { useScrollInteraction, type ScrollInteraction } from '../hooks/useScrollInteraction';
import { useDragInteraction, type DragInteraction } from '../hooks/useDragInteraction';
import type { ComponentDeletedEvent, EventPayload } from '../../messaging-api';

export interface NodeToTargetMapEntry {
    type: 'region' | 'component';
    parentId?: string;
    componentId: string;
    regionId: string;
    componentIds: string[];
    componentTypeInclusions?: string[];
    componentTypeExclusions?: string[];
}

export interface DesignState extends DragInteraction, ScrollInteraction {
    selectedComponentId: string | null;
    hoveredComponentId: string | null;
    setSelectedComponent: (componentId: string) => void;
    setHoveredComponent: (componentId: string | null) => void;
    deleteComponent: (event: EventPayload<ComponentDeletedEvent>) => void;
    focusComponent: (node: Element) => void;
    focusedComponentId: string | null;
    nodeToTargetMap: WeakMap<Element, NodeToTargetMapEntry>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DesignStateContext = React.createContext<DesignState>(null as unknown as DesignState);

export const DesignStateProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
    const selectInteraction = useSelectInteraction();
    const hoverInteraction = useHoverInteraction();
    const deleteInteraction = useDeleteInteraction({
        selectedComponentId: selectInteraction.selectedComponentId,
        setSelectedComponent: selectInteraction.setSelectedComponent,
    });
    const focusInteraction = useFocusInteraction({
        setSelectedComponent: selectInteraction.setSelectedComponent,
    });
    const scrollInteraction = useScrollInteraction();
    const nodeToTargetMap = React.useMemo(() => new WeakMap(), []);
    const dragInteraction = useDragInteraction({ nodeToTargetMap });

    const state = React.useMemo(
        () => ({
            ...deleteInteraction,
            ...selectInteraction,
            ...hoverInteraction,
            ...focusInteraction,
            ...dragInteraction,
            ...scrollInteraction,
            nodeToTargetMap,
        }),
        [
            deleteInteraction,
            selectInteraction,
            hoverInteraction,
            focusInteraction,
            dragInteraction,
            nodeToTargetMap,
            scrollInteraction,
        ]
    );

    return <DesignStateContext.Provider value={state}>{children}</DesignStateContext.Provider>;
};
