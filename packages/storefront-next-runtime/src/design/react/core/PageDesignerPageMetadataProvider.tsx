import { lazy } from 'react';
import { usePageDesignerMode } from './PageDesignerProvider';
import type { ShopperExperience } from '@/scapi-client/types';

const LazyPageRegistration = lazy(() =>
    import('../components/PageRegistration').then((module) => ({ default: module.PageRegistration }))
);

/**
 * Provides the page metadata for Page Designer.
 */
export function PageDesignerPageMetadataProvider({
    page,
    children,
}: React.PropsWithChildren<{ page: ShopperExperience.schemas['Page'] }>) {
    const { isDesignMode } = usePageDesignerMode();

    if (!isDesignMode) {
        return <>{children}</>;
    }

    return <LazyPageRegistration page={page}>{children}</LazyPageRegistration>;
}
