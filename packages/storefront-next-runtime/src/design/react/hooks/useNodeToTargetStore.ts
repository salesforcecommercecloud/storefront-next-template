/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import { useDesignState } from './useDesignState';
import type { NodeToTargetMapEntry } from '../context/DesignStateContext';

export function useNodeToTargetStore({
    parentId,
    componentId,
    contentLinkUuid,
    regionId,
    nodeRef,
    type,
    contentLinkUuids,
    componentTypeInclusions,
    componentTypeExclusions,
}: Partial<NodeToTargetMapEntry> & {
    nodeRef: React.RefObject<Element | null>;
}): void {
    const { nodeToTargetMap } = useDesignState();

    React.useEffect(() => {
        if (nodeRef.current) {
            nodeToTargetMap.set(nodeRef.current, {
                parentId,
                componentId,
                contentLinkUuid,
                regionId,
                type,
                contentLinkUuids,
                componentTypeInclusions,
                componentTypeExclusions,
            } as NodeToTargetMapEntry);
        }
    }, [
        nodeRef,
        parentId,
        componentId,
        contentLinkUuid,
        regionId,
        type,
        contentLinkUuids,
        nodeToTargetMap,
        componentTypeInclusions,
        componentTypeExclusions,
    ]);
}
