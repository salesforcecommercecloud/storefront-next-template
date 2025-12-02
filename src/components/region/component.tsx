import { type ReactElement, memo, Suspense } from 'react';
import { registry } from '@/lib/registry';
import { Await } from 'react-router';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';

export interface ComponentProps {
    component: ShopperExperience.schemas['Component'];
    className?: string;
    componentData?: Promise<Record<string, Promise<unknown>>>;
    regionId: string;
}

export const Component = memo(function Component({
    component,
    componentData,
    className,
}: ComponentProps): ReactElement {
    const FallbackComponent = registry.getFallback(component.typeId);
    const metadata = registry.getMetadata(component.typeId);
    const DynamicComponent = registry.getComponent(component.typeId);
    if (!DynamicComponent) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw registry.preload(component.typeId);
    }

    // Create a single promise that chains through both levels
    const dataPromise = componentData
        ? componentData.then((dataMap) => dataMap[component.id])
        : Promise.resolve(undefined);

    return (
        <Suspense fallback={FallbackComponent ? <FallbackComponent /> : <div />}>
            <Await resolve={dataPromise}>
                {(data) => (
                    <DynamicComponent
                        {...component.data}
                        designMetadata={{
                            name: metadata?.name,
                            isFragment: false,
                            isVisible: Boolean(component.visible),
                            id: component.id,
                        }}
                        data={data}
                        className={className}
                    />
                )}
            </Await>
        </Suspense>
    );
});
