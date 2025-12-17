/* eslint-disable react/prop-types */
/* eslint-disable react-refresh/only-export-components */
import { render as tlRender, act, waitFor, type RenderResult, cleanup as tlCleanup } from '@testing-library/react';
import type { HostToClientConfiguration } from '../messaging-api/domain-types';
import type { HostApi } from '../messaging-api/api-types';
import { createHostApi } from '../messaging-api/host';
import { createReactComponentDesignDecorator } from '../react/components/ComponentDecorator';
import type {
    ComponentDecoratorProps,
    RegionDesignMetadata,
    RegionDecoratorProps,
} from '../react/components/component.types';
import { PageDesignerProvider } from '../react/core/PageDesignerProvider';
import { createTestBed } from './test-bed';
import { createReactRegionDesignDecorator } from '../react/components/RegionDecorator';
import { ComponentContext } from '../react/core/ComponentContext';
import { PageDesignerPageMetadataProvider } from '../react/core/PageDesignerPageMetadataProvider';
import { beforeEach, expect, afterEach } from 'vitest';
import type { RecursivePartial } from './types';

// Preload the dynamic context
import '../react/context/DesignContext';

const TestRegion: React.FC<React.PropsWithChildren> = ({ children }) => <div data-testid="test-region">{children}</div>;

type Result = RenderResult & { element: HTMLElement; host: HostApi; root: HTMLElement; region: HTMLElement };

export const TEST_PAGE = { id: 'test-page', typeId: 'test-page-type' };

export function createComponentTestBed<TState extends Record<string, unknown>>(state: () => TState) {
    let afterHostCreatedFns: ((host: HostApi) => void)[];

    beforeEach(() => {
        afterHostCreatedFns = [];
    });

    afterEach(() => {
        tlCleanup();
    });

    const testBed = createTestBed({
        renderer: async (
            component: React.FC<React.PropsWithChildren>,
            {
                props = {},
                regionMetadata = { id: 'test-region', componentIds: ['test-1', 'test-2', 'test-3'] },
                waitForHost = true,
                configFactory,
            }: {
                props?: RecursivePartial<ComponentDecoratorProps<object>>;
                regionMetadata?: Partial<RegionDecoratorProps<unknown>['designMetadata']>;
                waitForHost?: boolean;
                configFactory?: () => Promise<HostToClientConfiguration>;
            } = {}
        ) => {
            const DecoratedComponent = createReactComponentDesignDecorator(component);
            const DecoratedRegion = createReactRegionDesignDecorator(TestRegion);
            const host = testBed.setupHost();
            // Pass null here to have an unset mode.
            const mode = testBed.state.mode === undefined ? 'EDIT' : testBed.state.mode;

            if (mode) {
                const originalLocation = window.location;

                Reflect.deleteProperty(window, 'location');
                window.location = {
                    ...originalLocation,
                    search: `?mode=${mode}`,
                } as string & Location;

                testBed.cleanup(() => {
                    window.location = originalLocation as string & Location;
                });
            }

            const designMetadata = {
                id: 'test-1',
                isVisible: true,
                isFragment: false,
                ...props.designMetadata,
            } as unknown as ComponentDecoratorProps<object>['designMetadata'];

            Object.assign(props, { designMetadata });

            const defaultConfigFactory = () =>
                Promise.resolve({
                    locale: 'en-US',
                    components: {
                        'test-1': {
                            id: 'test-1',
                            name: 'Test 1',
                            type: 'commerce.test',
                        },
                    },
                    componentTypes: {
                        'commerce.test': {
                            id: 'commerce.test',
                            name: 'Commerce Test',
                            label: 'Commerce Test',
                            image: 'https://via.placeholder.com/150',
                        },
                    },
                    labels: {},
                });

            const connectionPromise = new Promise<void>((resolve, reject) => {
                host.connect({
                    configFactory: () => Promise.resolve(configFactory?.() ?? defaultConfigFactory()),
                    onClientConnected: () => resolve(),
                    onError: (error) => reject(error),
                });
            });

            afterHostCreatedFns.forEach((fn) => fn(host));

            const result = tlRender(
                <PageDesignerProvider clientId="test1" targetOrigin="*">
                    <PageDesignerPageMetadataProvider page={TEST_PAGE}>
                        <ComponentContext.Provider value={{ componentId: 'test-parent' }}>
                            <DecoratedRegion designMetadata={regionMetadata as RegionDesignMetadata}>
                                <DecoratedComponent {...(props as unknown as ComponentDecoratorProps<object>)}>
                                    Test Content
                                </DecoratedComponent>
                                {/* Other components that we could drag over */}
                                <DecoratedComponent
                                    designMetadata={{
                                        id: 'test-2',
                                        isFragment: false,
                                        isVisible: true,
                                        isLocalized: true,
                                    }}
                                />
                                <DecoratedComponent
                                    designMetadata={{
                                        id: 'test-3',
                                        isFragment: false,
                                        isVisible: true,
                                        isLocalized: true,
                                    }}
                                />
                            </DecoratedRegion>
                        </ComponentContext.Provider>
                    </PageDesignerPageMetadataProvider>
                </PageDesignerProvider>
            );

            // Wait for Suspense to resolve by waiting for test content to appear
            // This indicates the lazy DesignProvider has loaded and rendered
            await result.findAllByText('Test Content', {}, { timeout: 5_000 });

            if (mode && waitForHost) {
                await act(() => connectionPromise);
            }

            const finalResult = Object.assign(result, {
                host,
                root: result.container,
                region: result.container.querySelector('.pd-design__region'),
                element: result.container.querySelector('.pd-design__decorator:not(.pd-design__region)'),
            }) as Result;

            return finalResult;
        },
        state: () => ({
            ...state(),
            mode: 'EDIT' as 'EDIT' | 'PREVIEW' | null,
        }),
        methods: {
            afterHostCreated: (fn: (host: HostApi) => void) => {
                afterHostCreatedFns.push(fn);
            },
            findBySelector: (element: HTMLElement, selector: string) =>
                waitFor(() => {
                    const node = element.querySelector(selector);

                    expect(node).toBeDefined();

                    return node as HTMLElement;
                }),
            setupHost: () => {
                const emitter: Parameters<typeof createHostApi>[0]['emitter'] = {
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    postMessage: (message: any) => window.postMessage(message, '*'),
                    addEventListener: (handler) => {
                        const listener = (event: MessageEvent) => handler(event.data);

                        window.parent.addEventListener('message', listener);

                        return () => window.parent.removeEventListener('message', listener);
                    },
                };

                const host = createHostApi({ emitter, id: 'test-host' });

                testBed.cleanup(
                    () =>
                        new Promise((resolve) => {
                            host.disconnect();
                            setTimeout(resolve, 0);
                        })
                );

                return host;
            },
        },
    });

    return testBed;
}
