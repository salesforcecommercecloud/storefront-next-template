/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, { useCallback } from 'react';
import type { RegionDecoratorProps } from './component.types';
import { useRegionDecoratorClasses } from '../hooks/useRegionDecoratorClasses';
import { useNodeToTargetStore } from '../hooks/useNodeToTargetStore';
import { DesignFrame } from './DesignFrame';
import { useLabels } from '../hooks/useLabels';
import { RegionContext, type RegionContextType } from '../core/RegionContext';
import { useComponentContext } from '../core/ComponentContext';
import { useDesignState } from '../hooks/useDesignState';
import { isComponentTypeAllowedInRegion } from '../utils/regionUtils';

export function DesignRegion(props: RegionDecoratorProps<unknown>): React.JSX.Element {
    const { designMetadata, children } = props;
    const { name, id, componentIds, componentTypeInclusions, componentTypeExclusions } = designMetadata;
    const nodeRef = React.useRef<HTMLDivElement>(null);
    const classes = useRegionDecoratorClasses({
        regionId: id,
        componentTypeInclusions,
        componentTypeExclusions,
    });
    const { dragState } = useDesignState();
    const labels = useLabels();
    const showFrame = Boolean(id && dragState.currentDropTarget?.regionId === id);
    const { componentId: parentComponentId } = useComponentContext() ?? {};

    useNodeToTargetStore({
        type: 'region',
        nodeRef,
        parentId: parentComponentId,
        componentIds,
        componentId: parentComponentId ?? '',
        regionId: id,
        componentTypeInclusions,
        componentTypeExclusions,
    });

    const context = React.useMemo<RegionContextType>(() => ({ regionId: id, componentIds }), [id, componentIds]);

    const handleDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            const isComponentAllowed = isComponentTypeAllowedInRegion(
                dragState.componentType,
                componentTypeInclusions,
                componentTypeExclusions
            );

            if (isComponentAllowed) {
                event.preventDefault();
            }
        },
        [dragState.componentType, componentTypeInclusions, componentTypeExclusions]
    );

    return (
        <div className={classes} ref={nodeRef} onDragOver={handleDragOver} data-region-id={id}>
            <DesignFrame
                name={name ?? labels.defaultRegionName ?? 'Region'}
                parentId={parentComponentId}
                regionId={id}
                localized
                showFrame={showFrame}
                showToolbox={false}>
                <RegionContext.Provider value={context}>{children}</RegionContext.Provider>
            </DesignFrame>
        </div>
    );
}
