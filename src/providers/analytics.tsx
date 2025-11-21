'use client';

import { createContext, type PropsWithChildren, useContext } from 'react';
import type { EventMediator } from '@salesforce/storefront-next-runtime/events';

const AnalyticsContext = createContext<EventMediator | undefined>(undefined);

const AnalyticsProvider = ({ children, value }: PropsWithChildren<{ value?: EventMediator }>) => {
    return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAnalytics = (): EventMediator | undefined => {
    return useContext(AnalyticsContext);
};

export default AnalyticsProvider;
