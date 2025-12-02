/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import React from 'react';
import { cleanup as tlCleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createComponentTestBed } from '../../test/component-test-bed';

// Preload the dynamic context
import '../context/DesignContext';

// Test component to decorate
const TestComponent: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div data-testid="test-component">{children}</div>
);

describe('design/react/ComponentDecorator', () => {
    const testBed = createComponentTestBed(() => ({
        elementsOnPoint: [] as HTMLElement[],
    }));

    beforeEach(() => {
        testBed.defineProperty(document, 'elementsFromPoint', {
            value: () => testBed.state.elementsOnPoint,
        });
        testBed.afterRender(async ({ root, findByTestId }) => {
            if (testBed.state.mode) {
                const region = await testBed.findBySelector(root, '.pd-design__region');
                const component = await findByTestId('design-component-test-3');

                testBed.state.elementsOnPoint = [component, region];
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        testBed.cleanup(() => tlCleanup());
    });

    describe('when decorating a component', () => {
        it('should render the original component when not in design mode', async () => {
            testBed.state.mode = null;

            const { element, getAllByTestId } = await testBed.render(TestComponent);

            expect(getAllByTestId('test-component')).toHaveLength(3);
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
            it('should use the component type label when available', async () => {
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

            it('should fall back to name when the component type label is not available', async () => {
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
                            locale: 'en-US',
                            components: {
                                'test-1': {
                                    id: 'test-1',
                                    name: 'Test 1',
                                    type: 'commerce.test',
                                },
                            },
                            componentTypes: {},
                            labels: {},
                        }),
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
                    configFactory: () =>
                        Promise.resolve({
                            locale: 'en-US',
                            components: {
                                'test-1': {
                                    id: 'test-1',
                                    name: 'Test 1',
                                    type: 'commerce.test',
                                },
                            },
                            componentTypes: {},
                            labels: {},
                        }),
                });

                // Select component to show the frame
                element.click();

                const frameLabel = await testBed.findBySelector(element, '.pd-design__frame__name');
                expect(frameLabel.textContent).toBe('Component');
            });
        });
    });

    describe('when dragging a component', () => {
        let mockRect: Partial<DOMRect>;

        beforeEach(() => {
            mockRect = { x: 0, y: 0, width: 600, height: 600 };
            testBed.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', { value: () => mockRect });
            testBed.defineProperty(window, 'scrollX', { value: 0 });
            testBed.defineProperty(window, 'scrollY', { value: 0 });
        });

        describe.each`
            width  | height | x      | y      | axis   | insertType
            ${600} | ${600} | ${100} | ${300} | ${'x'} | ${'before'}
            ${600} | ${600} | ${500} | ${300} | ${'x'} | ${'after'}
            ${600} | ${600} | ${300} | ${100} | ${'y'} | ${'before'}
            ${600} | ${600} | ${300} | ${500} | ${'y'} | ${'after'}
            ${600} | ${600} | ${100} | ${100} | ${'y'} | ${'before'}
            ${600} | ${600} | ${500} | ${500} | ${'y'} | ${'after'}
            ${600} | ${300} | ${200} | ${50}  | ${'y'} | ${'before'}
            ${600} | ${300} | ${200} | ${250} | ${'y'} | ${'after'}
            ${300} | ${600} | ${50}  | ${200} | ${'x'} | ${'before'}
            ${300} | ${600} | ${250} | ${200} | ${'x'} | ${'after'}
        `('to ($x, $y $width x $height) position', ({ width, height, x, y, axis, insertType }) => {
            beforeEach(() => {
                mockRect = { left: 0, top: 0, width, height };
                testBed.afterRender(async ({ element }) => {
                    // Click on move icon
                    const moveButton = await testBed.findBySelector(element, '.pd-design__frame__toolbox-button');

                    fireEvent.mouseDown(moveButton);
                    fireEvent(window, Object.assign(new DragEvent('dragover'), { clientX: x, clientY: y }));
                });
            });

            it(`should show the drop target on ${axis} axis and with ${insertType} insert type`, async () => {
                const { findByTestId } = await testBed.render(TestComponent);
                const component = await findByTestId('design-component-test-3');

                expect(component.classList.contains(`pd-design__drop-target__${axis}-${insertType}`)).toBe(true);
            });
        });
    });
});
