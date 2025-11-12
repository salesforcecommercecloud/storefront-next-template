/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import React from 'react';
import {
    render as tlRender,
    cleanup as tlCleanup,
    act,
    fireEvent,
    waitFor,
    type RenderResult,
} from '@testing-library/react';
import type { HostApi } from '../../messaging-api/api-types';
import type { HostToClientConfiguration } from '../../messaging-api/domain-types';
import { createHostApi } from '../../messaging-api/host';
import { createReactComponentDesignDecorator } from './ComponentDecorator';
import type { ComponentDecoratorProps, RegionDecoratorProps, RegionDesignMetadata } from './component.types';
import { PageDesignerProvider } from '../context/PageDesignerProvider';
import { createTestBed } from '../../test/testBed';
import { createReactRegionDesignDecorator } from './RegionDecorator';
import { ComponentContext } from '../context/ComponentContext';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// Preload the dynamic context
import '../context/DesignContext';

// Test component to decorate
const TestComponent: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div data-testid="test-component">{children}</div>
);

const TestRegion: React.FC<React.PropsWithChildren> = ({ children }) => <div data-testid="test-region">{children}</div>;

type Result = RenderResult & { element: HTMLElement; host: HostApi };

describe('design/react/ComponentDecorator', () => {
    const testBed = createTestBed({
        renderer: async (
            component: React.FC<React.PropsWithChildren>,
            {
                props = {},
                regionMetadata = {},
                mode = 'EDIT',
                waitForHost = true,
                configFactory,
            }: {
                props?: Partial<ComponentDecoratorProps<object>>;
                regionMetadata?: Partial<RegionDecoratorProps<unknown>['designMetadata']>;
                mode?: 'EDIT' | 'PREVIEW' | null;
                waitForHost?: boolean;
                configFactory?: () => Promise<HostToClientConfiguration>;
            } = {}
        ) => {
            const DecoratedComponent = createReactComponentDesignDecorator(component);
            const DecoratedRegion = createReactRegionDesignDecorator(TestRegion);
            const host = testBed.setupHost();

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

            const designMetadata =
                props.designMetadata ??
                ({
                    id: 'test-1',
                } as unknown as ComponentDecoratorProps<object>['designMetadata']);

            Object.assign(props, { designMetadata });

            const defaultConfigFactory = () => Promise.resolve({ components: {}, componentTypes: {}, labels: {} });

            const connectionPromise = new Promise<void>((resolve, reject) => {
                host.connect({
                    configFactory: configFactory || defaultConfigFactory,
                    onClientConnected: () => resolve(),
                    onError: () => reject(new Error('Host connection failed')),
                });
            });

            const result = tlRender(
                <PageDesignerProvider clientId="test1" targetOrigin="*">
                    <ComponentContext.Provider value={{ componentId: 'test-parent' }}>
                        <DecoratedRegion designMetadata={regionMetadata as RegionDesignMetadata}>
                            <DecoratedComponent {...(props as unknown as ComponentDecoratorProps<object>)}>
                                Test Content
                            </DecoratedComponent>
                        </DecoratedRegion>
                    </ComponentContext.Provider>
                </PageDesignerProvider>
            );

            if (mode !== null && waitForHost) {
                // Wait for Suspense to resolve by waiting for test content to appear
                // This indicates the lazy DesignProvider has loaded and rendered
                await result.findByText('Test Content', {}, { timeout: 5_000 });
                await act(() => connectionPromise);
            }

            const finalResult = Object.assign(result, {
                host,
                element: result.container.querySelector('.pd-design__decorator:not(.pd-design__region)'),
            }) as Result;

            return finalResult;
        },
        methods: {
            findBySelector: (element: HTMLElement, selector: string) =>
                waitFor(() => {
                    const node = element.querySelector(selector);

                    expect(node).toBeDefined();

                    return node as HTMLElement;
                }),
            setupHost: () => {
                const emitter: Parameters<typeof createHostApi>[0]['emitter'] = {
                    postMessage: (message: any) => window.postMessage(message, '*'),
                    addEventListener: (handler) => {
                        const listener = (event: MessageEvent) => handler(event.data);

                        window.parent.addEventListener('message', listener);

                        return () => window.parent.removeEventListener('message', listener);
                    },
                };

                const host = createHostApi({ emitter, id: 'test-host' });

                testBed.cleanup(() => host.disconnect());

                return host;
            },
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        document.elementsFromPoint = vi.fn(() => []);
    });

    afterEach(() => {
        testBed.cleanup(() => tlCleanup());
    });

    describe('when decorating a component', () => {
        it('should render the original component when not in design mode', async () => {
            const { element, getByTestId } = await testBed.render(TestComponent, {
                mode: null,
            });

            expect(getByTestId('test-component')).toBeDefined();
            expect(element).toBeNull();
        });

        it('should render with design wrapper when in design mode', async () => {
            const { element } = await testBed.render(TestComponent);

            expect(element).toBeDefined();
        });

        describe('when the component is a fragment', () => {
            it('should include the corresponding fragment class', async () => {
                const { element } = await testBed.render(TestComponent, {
                    props: {
                        designMetadata: {
                            id: 'test-1',
                            isFragment: true,
                        },
                    },
                    regionMetadata: {
                        regionDirection: 'row',
                        id: 'test-region',
                    },
                });

                expect(element.classList.contains('pd-design__fragment')).toBe(true);
                expect(element.classList.contains('pd-design__component')).toBe(false);
            });
        });

        describe('when the component is a component', () => {
            it('should include the corresponding component class', async () => {
                const { element } = await testBed.render(TestComponent, {
                    props: {
                        designMetadata: {
                            id: 'test-1',
                            isFragment: false,
                        },
                    },
                    regionMetadata: {
                        regionDirection: 'row',
                        id: 'test-region',
                    },
                });

                expect(element.classList.contains('pd-design__fragment')).toBe(false);
                expect(element.classList.contains('pd-design__component')).toBe(true);
            });
        });

        describe('when the component is hovered', () => {
            let hostSpy: Mock;

            beforeEach(() => {
                hostSpy = vi.fn();
                testBed.afterRender(({ host, element }) => {
                    host.on('ComponentHoveredIn', hostSpy);
                    fireEvent.mouseEnter(element);
                });
            });
            it('should show the frame', async () => {
                const { element } = await testBed.render(TestComponent);

                expect(element.classList.contains('pd-design__frame--visible')).toBe(true);
                expect(element.classList.contains('pd-design__decorator--hovered')).toBe(true);
            });

            it('should notify the host of the hover', async () => {
                await testBed.render(TestComponent);

                await waitFor(() => {
                    expect(hostSpy).toHaveBeenCalledWith(expect.objectContaining({ componentId: 'test-1' }));
                });
            });

            describe('when hovering out of the component', () => {
                let hoverOutSpy: Mock;

                beforeEach(() => {
                    hoverOutSpy = vi.fn();
                    testBed.afterRender(async ({ host, element }) => {
                        await waitFor(() => {
                            expect(element.classList.contains('pd-design__decorator--hovered')).toBe(true);
                        });

                        host.on('ComponentHoveredOut', hoverOutSpy);
                        fireEvent.mouseLeave(element);
                    });
                });

                it('should notify the host of the hover out', async () => {
                    await testBed.render(TestComponent);

                    await waitFor(() => {
                        expect(hostSpy).toHaveBeenCalledWith(expect.objectContaining({ componentId: 'test-1' }));
                    });
                });

                it('should not show the frame', async () => {
                    const { element } = await testBed.render(TestComponent);

                    expect(element.classList.contains('pd-design__frame--visible')).toBe(false);
                    expect(element.classList.contains('pd-design__decorator--hovered')).toBe(false);
                });
            });
        });

        describe('when the component is selected', () => {
            it('should show the frame', async () => {
                const { element } = await testBed.render(TestComponent);

                element.click();

                const frame = await testBed.findBySelector(element, '.pd-design__frame');

                expect(frame.classList.contains('pd-design__frame--visible')).toBe(true);
                expect(element.classList.contains('pd-design__decorator--selected')).toBe(true);
            });

            it('should notify the host of the selection', async () => {
                const { element, host } = await testBed.render(TestComponent);

                return new Promise<void>((resolve) => {
                    host.on('ComponentSelected', (event) => {
                        expect(event).toEqual(
                            expect.objectContaining({
                                componentId: 'test-1',
                            })
                        );
                        resolve();
                    });

                    element?.click();
                });
            }, 500);
        });

        describe('when the component is deleted', () => {
            let hostSpy: Mock;

            beforeEach(() => {
                hostSpy = vi.fn();
                testBed.afterRender(async ({ host, element }) => {
                    // Select the component so the frame is shown
                    fireEvent.click(element);

                    await waitFor(() => {
                        expect(element.classList.contains('pd-design__frame--visible')).toBe(true);
                    });

                    host.on('ComponentDeleted', hostSpy);
                    const deleteButton = await testBed.findBySelector(element, '.pd-design__frame__delete-icon');
                    fireEvent.click(deleteButton);
                });
            });

            it('should notify the host of the deletion', async () => {
                await testBed.render(TestComponent, {
                    props: {
                        designMetadata: {
                            id: 'test-1',
                            isFragment: false,
                        },
                    },
                    regionMetadata: {
                        regionDirection: 'row',
                        id: 'test-region',
                    },
                });

                await waitFor(() => {
                    expect(hostSpy).toHaveBeenCalledWith(
                        expect.objectContaining({
                            componentId: 'test-1',
                            sourceComponentId: 'test-parent',
                            sourceRegionId: 'test-region',
                        })
                    );
                });
            });
        });

        describe('when the component is focused', () => {
            let scrollSpy: Mock;

            beforeEach(() => {
                scrollSpy = vi.fn();
                testBed.afterRender(({ element, host }) => {
                    element.scrollIntoView = scrollSpy;
                    host.focusComponent({ componentId: 'test-1' });
                });
            });

            it('should scroll to the component that is focused', async () => {
                await testBed.render(TestComponent);

                await waitFor(() => {
                    expect(scrollSpy).toHaveBeenCalled();
                });
            });
        });

        describe('when the component name is displayed', () => {
            it('should use the component typelabel when available', async () => {
                const { element } = await testBed.render(TestComponent, {
                    props: {
                        designMetadata: {
                            id: 'test-1',
                            name: 'FallbackName',
                            isFragment: false,
                        },
                    },
                    configFactory: () =>
                        Promise.resolve({
                            components: {
                                'test-1': {
                                    id: 'test-1',
                                    type: 'test-type',
                                },
                            },
                            componentTypes: {
                                'test-type': {
                                    id: 'test-type',
                                    name: 'TestType',
                                    image: 'test-image.png',
                                    label: 'Custom Label',
                                },
                            },
                            labels: {},
                        }),
                });

                // Select component to show the frame
                element.click();

                const frameLabel = await testBed.findBySelector(element, '.pd-design__frame__name');
                expect(frameLabel.textContent).toBe('Custom Label');
            });

            it('should fall back to name when the component typelabel is not available', async () => {
                const { element } = await testBed.render(TestComponent, {
                    props: {
                        designMetadata: {
                            id: 'test-1',
                            name: 'FallbackName',
                            isFragment: false,
                        },
                    },
                });

                // Select component to show the frame
                element.click();

                const frameLabel = await testBed.findBySelector(element, '.pd-design__frame__name');
                expect(frameLabel.textContent).toBe('FallbackName');
            });

            it('should fall back to "Component" when neither label nor name is available', async () => {
                const { element } = await testBed.render(TestComponent, {
                    props: {
                        designMetadata: {
                            id: 'test-1',
                            isFragment: false,
                        },
                    },
                });

                // Select component to show the frame
                element.click();

                const frameLabel = await testBed.findBySelector(element, '.pd-design__frame__name');
                expect(frameLabel.textContent).toBe('Component');
            });
        });
    });
});
