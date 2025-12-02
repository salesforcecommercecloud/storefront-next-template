/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from 'react';
import {
    createHostApi,
    type ClientAcknowledgedEvent,
    type EventPayload,
} from '@salesforce/storefront-next-runtime/design/messaging';
import { useDesignContext } from '@salesforce/storefront-next-runtime/design/react';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';

/**
 * A component that creates a design layer host for testing purposes.
 * This allows design layer interaction without having a host application (Page Designer) connected.
 * You can add this component anywhere under the PageDesignerProvider component.
 * THIS IS ONLY FOR TESTING PURPOSES.
 * @example
 * ```typescript
 * <PageDesignerProvider>
 *   <PageDesignerHostProvider />
 * </PageDesignerProvider>
 * ```
 * @param props.page - The page data used for the page.
 */
export function PageDesignerHostProvider({
    expose = false,
    logEvents = true,
}: {
    expose?: boolean;
    logEvents?: boolean;
} = {}) {
    const { clientPage } = useDesignContext();
    const host = useMemo(
        () =>
            createHostApi({
                id: 'test-host',
                emitter: {
                    postMessage: (message: any) => window.postMessage(message, '*'),
                    addEventListener: (handler) => {
                        const listener = (event: MessageEvent) => handler(event.data);

                        window.parent.addEventListener('message', listener);

                        return () => window.parent.removeEventListener('message', listener);
                    },
                },
            }),
        []
    );

    useEffect(() => {
        host.connect({
            configFactory: () => Promise.resolve(getHostConfigFromPage(clientPage)),
            onClientConnected: (clientId) => {
                /* eslint-disable-next-line no-console */
                console.log(`PageDesignerHost connected to client ${clientId}`);
            },
        });

        if (logEvents) {
            host.on('Event', (event) => {
                /* eslint-disable-next-line no-console */
                console.log('PageDesignerHost event:', event);
            });
        }

        return () => {
            host.disconnect();
        };
    }, [clientPage, host, logEvents]);

    // Window won't exist during SSR.
    if (expose && typeof window !== 'undefined') {
        // Expose the host object to the window to allow API methods to be called from the console.
        (window as any).PageDesignerHost = host;
    }

    return <></>;
}

function* forEachComponent(
    regions: ShopperExperience.schemas['Region'][]
): IterableIterator<ShopperExperience.schemas['Component']> {
    for (const region of regions) {
        for (const component of region.components ?? []) {
            yield component;

            if (component.regions) {
                yield* forEachComponent(component.regions);
            }
        }
    }
}

function getHostConfigFromPage(page: ShopperExperience.schemas['Page'] | null): EventPayload<ClientAcknowledgedEvent> {
    const config: EventPayload<ClientAcknowledgedEvent> = {
        components: {},
        componentTypes: {},
        labels: {},
    };

    for (const component of forEachComponent(page?.regions ?? [])) {
        config.componentTypes[component.typeId] = {
            id: component.typeId,
            // We don't have this information just from the page.
            name: `${component.typeId}-${component.id}`,
            image: '',
            label: '',
        };

        config.components[component.id] = {
            id: component.id,
            type: component.typeId,
        };
    }

    return config;
}
