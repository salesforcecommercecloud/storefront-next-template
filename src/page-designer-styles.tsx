import { useEffect } from 'react';
import { usePageDesignerMode } from '@salesforce/storefront-next-runtime/design/react/core';

/**
 * Imports the Page Designer styles when in design mode.
 */
export function PageDesignerStyles() {
    const isDesignMode = usePageDesignerMode();

    useEffect(() => {
        if (isDesignMode) {
            void import('@salesforce/storefront-next-runtime/design/styles.css');
        }
    }, [isDesignMode]);

    return <></>;
}
