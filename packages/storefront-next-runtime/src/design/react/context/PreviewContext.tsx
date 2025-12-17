/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { createContext, useMemo } from 'react';
import { isPreviewModeActive } from '../../modeDetection';

type PreviewContextType = {
    isPreviewMode: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components
export const PreviewContext = createContext<PreviewContextType>({
    isPreviewMode: false,
});

export const PreviewProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
    const isPreviewMode = isPreviewModeActive();

    const contextValue = useMemo<PreviewContextType>(
        () => ({
            isPreviewMode,
        }),
        [isPreviewMode]
    );

    return <PreviewContext.Provider value={contextValue}>{children}</PreviewContext.Provider>;
};
