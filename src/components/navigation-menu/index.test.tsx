import type { ComponentPropsWithoutRef } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockCategory, createMockCategoryWithChildren, testData } from './__tests__/data';
import CategoryNavigationMenu from './impl';
import { WithCategoryNavigationMenu } from './index';

// Mock CategoryNavigationMenu component
vi.mock('./impl', () => ({
    default: vi.fn(() => <div data-testid="mocked-navigation-menu">Mocked Navigation Menu</div>),
}));

describe('WithCategoryNavigationMenu Component', () => {
    // Get reference to the mocked CategoryNavigationMenu
    const MockCategoryNavigationMenu = vi.mocked(CategoryNavigationMenu) as typeof CategoryNavigationMenu;

    const renderComponent = (props: Omit<ComponentPropsWithoutRef<typeof WithCategoryNavigationMenu>, 'children'>) => {
        return render(
            <WithCategoryNavigationMenu {...props}>
                {({ categories }) => <MockCategoryNavigationMenu categories={categories} />}
            </WithCategoryNavigationMenu>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render root categories based on a "resolve" promise', async () => {
            const { getByTestId } = renderComponent({
                resolve: Promise.resolve(
                    createMockCategoryWithChildren({ id: 'root', name: 'Root', categories: testData.basic })
                ),
                fallback: <div data-testid="fallback">Loading...</div>,
            });

            // Should show the fallback while resolving the promise
            expect(getByTestId('fallback')).toBeInTheDocument();

            // Wait for promise to resolve
            await waitFor(() => {
                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(1);
                expect(MockCategoryNavigationMenu).toHaveBeenCalledWith(
                    expect.objectContaining({
                        categories: expect.arrayContaining([
                            expect.objectContaining({ id: 'cat-1', name: 'Category 1' }),
                            expect.objectContaining({ id: 'cat-2', name: 'Category 2' }),
                            expect.objectContaining({ id: 'cat-3', name: 'Category 3' }),
                        ]),
                    }),
                    undefined
                );
            });
        });

        it('should filter root categories based on the "c_showInMenu" property', async () => {
            renderComponent({
                resolve: Promise.resolve(
                    createMockCategoryWithChildren({ id: 'root', name: 'Root', categories: testData.mixedVisibility })
                ),
            });

            await waitFor(() => {
                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(1);
                expect(MockCategoryNavigationMenu).toHaveBeenCalledWith(
                    expect.objectContaining({
                        categories: [
                            expect.objectContaining({ id: 'visible-1', c_showInMenu: true }),
                            expect.objectContaining({ id: 'visible-2', c_showInMenu: true }),
                            expect.objectContaining({ id: 'visible-3', c_showInMenu: true }),
                        ],
                    }),
                    undefined
                );
            });
        });

        it('should handle empty root categories after filtering', async () => {
            const rootCategory = createMockCategoryWithChildren({
                id: 'root',
                name: 'Root',
                categories: [
                    createMockCategory({ id: 'hidden-1', name: 'Hidden 1', c_showInMenu: false }),
                    createMockCategory({ id: 'hidden-2', name: 'Hidden 2', c_showInMenu: false }),
                ],
            });

            renderComponent({ resolve: Promise.resolve(rootCategory) });

            await waitFor(() => {
                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(1);
                expect(MockCategoryNavigationMenu).toHaveBeenCalledWith(
                    expect.objectContaining({
                        categories: [],
                    }),
                    undefined
                );
            });
        });

        it('should render a cloned element if provided "children" is an element', async () => {
            const { getByTestId } = render(
                <WithCategoryNavigationMenu
                    resolve={Promise.resolve(
                        createMockCategoryWithChildren({ id: 'root', name: 'Root', categories: testData.basic })
                    )}
                    fallback={<div data-testid="fallback">Loading...</div>}>
                    <MockCategoryNavigationMenu />
                </WithCategoryNavigationMenu>
            );

            // Should show the fallback while resolving the promise
            expect(getByTestId('fallback')).toBeInTheDocument();

            // Wait for promise to resolve
            await waitFor(() => {
                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(1);
                expect(MockCategoryNavigationMenu).toHaveBeenCalledWith(
                    expect.objectContaining({
                        categories: expect.arrayContaining([
                            expect.objectContaining({ id: 'cat-1', name: 'Category 1' }),
                            expect.objectContaining({ id: 'cat-2', name: 'Category 2' }),
                            expect.objectContaining({ id: 'cat-3', name: 'Category 3' }),
                        ]),
                    }),
                    undefined
                );
            });
        });

        it('should not render anything when no "resolve" promise provided', () => {
            const { container } = renderComponent({});
            expect(container.firstChild).toBeNull();
        });

        it('should handle component unmount during promise resolution', async () => {
            const rootCategory = createMockCategoryWithChildren({
                id: 'root',
                name: 'Root',
                categories: testData.basic,
            });
            const promise = Promise.resolve(rootCategory);
            const { container, unmount } = renderComponent({ resolve: promise });

            // Unmount before promise resolves
            unmount();

            await act(async () => {
                await promise;
            });

            expect(container.firstChild).toBeNull();
        });

        it('should render nested categories filtered based on the "c_showInMenu" property', async () => {
            const { getByTestId } = renderComponent({
                resolve: Promise.resolve(
                    createMockCategoryWithChildren({ id: 'root', name: 'Root', categories: testData.mixedVisibility })
                ),
                defer: Promise.all([
                    Promise.resolve(
                        createMockCategoryWithChildren({
                            id: 'visible-1',
                            name: 'Visible Category 1',
                            categories: [
                                createMockCategoryWithChildren({
                                    id: 'visible-1-1',
                                    name: 'Child Category 1.1',
                                    categories: [
                                        createMockCategory({ id: 'visible-1-1-1', name: 'Grandchild 1.1.1' }),
                                        createMockCategory({ id: 'visible-1-1-2', name: 'Grandchild 1.1.2' }),
                                    ],
                                }),
                                createMockCategoryWithChildren({
                                    id: 'visible-1-2',
                                    name: 'Child Category 1.2',
                                    categories: [
                                        createMockCategory({ id: 'visible-1-2-1', name: 'Grandchild 1.2.1' }),
                                        createMockCategory({ id: 'visible-1-2-2', name: 'Grandchild 1.2.2' }),
                                    ],
                                }),
                            ],
                        })
                    ),
                    Promise.resolve(
                        createMockCategoryWithChildren({
                            id: 'visible-2',
                            name: 'Visible Category 2',
                            categories: [
                                createMockCategoryWithChildren({
                                    id: 'visible-2-1',
                                    name: 'Visible Category 2.1',
                                    categories: [
                                        createMockCategory({
                                            id: 'visible-2-1-1',
                                            name: 'Grandchild 2.1.1',
                                            c_showInMenu: false,
                                        }),
                                        createMockCategory({ id: 'visible-2-1-2', name: 'Grandchild 2.1.2' }),
                                    ],
                                }),
                                createMockCategoryWithChildren({
                                    id: 'visible-2-2',
                                    name: 'Visible Category 2.2',
                                    categories: [
                                        createMockCategory({ id: 'visible-2-2-1', name: 'Grandchild 2.2.1' }),
                                        createMockCategory({ id: 'visible-2-2-2', name: 'Grandchild 2.2.2' }),
                                    ],
                                }),
                                createMockCategoryWithChildren({
                                    id: 'visible-2-3',
                                    name: 'Visible Category 2.3',
                                    categories: [
                                        createMockCategory({ id: 'visible-2-3-1', name: 'Grandchild 2.3.1' }),
                                        createMockCategory({
                                            id: 'visible-2-3-2',
                                            name: 'Grandchild 2.3.2',
                                            c_showInMenu: false,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    ),
                ]),
                fallback: <div data-testid="fallback">Loading...</div>,
            });

            // Should show the fallback while resolving the promise
            expect(getByTestId('fallback')).toBeInTheDocument();

            // Wait for promise to resolve
            await waitFor(() => {
                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(2);
                expect(MockCategoryNavigationMenu).toHaveBeenNthCalledWith(
                    1,
                    expect.objectContaining({
                        categories: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'visible-1',
                                c_showInMenu: true,
                                onlineSubCategoriesCount: 2,
                            }),
                            expect.objectContaining({
                                id: 'visible-2',
                                c_showInMenu: true,
                                onlineSubCategoriesCount: 3,
                            }),
                            expect.objectContaining({
                                id: 'visible-3',
                                c_showInMenu: true,
                                onlineSubCategoriesCount: 0,
                            }),
                        ]),
                    }),
                    undefined
                );

                expect(MockCategoryNavigationMenu).toHaveBeenNthCalledWith(
                    2,
                    expect.objectContaining({
                        categories: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'visible-1',
                                c_showInMenu: true,
                                onlineSubCategoriesCount: 2,
                                categories: expect.arrayContaining([
                                    expect.objectContaining({
                                        id: 'visible-1-1',
                                        c_showInMenu: true,
                                        onlineSubCategoriesCount: 2,
                                        categories: expect.arrayContaining([
                                            expect.objectContaining({
                                                id: 'visible-1-1-1',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                            expect.objectContaining({
                                                id: 'visible-1-1-2',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                        ]),
                                    }),
                                    expect.objectContaining({
                                        id: 'visible-1-2',
                                        c_showInMenu: true,
                                        onlineSubCategoriesCount: 2,
                                        categories: expect.arrayContaining([
                                            expect.objectContaining({
                                                id: 'visible-1-2-1',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                            expect.objectContaining({
                                                id: 'visible-1-2-2',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                        ]),
                                    }),
                                ]),
                            }),
                            expect.objectContaining({
                                id: 'visible-2',
                                c_showInMenu: true,
                                onlineSubCategoriesCount: 3,
                                categories: expect.arrayContaining([
                                    expect.objectContaining({
                                        id: 'visible-2-1',
                                        c_showInMenu: true,
                                        onlineSubCategoriesCount: 2,
                                        categories: expect.arrayContaining([
                                            expect.objectContaining({
                                                id: 'visible-2-1-2',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                        ]),
                                    }),
                                    expect.objectContaining({
                                        id: 'visible-2-2',
                                        c_showInMenu: true,
                                        onlineSubCategoriesCount: 2,
                                        categories: expect.arrayContaining([
                                            expect.objectContaining({
                                                id: 'visible-2-2-1',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                            expect.objectContaining({
                                                id: 'visible-2-2-2',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                        ]),
                                    }),
                                    expect.objectContaining({
                                        id: 'visible-2-3',
                                        c_showInMenu: true,
                                        onlineSubCategoriesCount: 2,
                                        categories: expect.arrayContaining([
                                            expect.objectContaining({
                                                id: 'visible-2-3-1',
                                                c_showInMenu: true,
                                                onlineSubCategoriesCount: 0,
                                            }),
                                        ]),
                                    }),
                                ]),
                            }),
                            expect.objectContaining({
                                id: 'visible-3',
                                c_showInMenu: true,
                                onlineSubCategoriesCount: 0,
                            }),
                        ]),
                    }),
                    undefined
                );
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle promise rejection', async () => {
            const error = new Error('Failed to load categories');

            const { getByTestId } = renderComponent({
                resolve: Promise.reject(error),
                fallback: <div data-testid="fallback">Loading...</div>,
                errorElement: <div data-testid="error">Error</div>,
            });

            // Should show loading state initially
            expect(getByTestId('fallback')).toBeInTheDocument();

            // Wait for promise to reject and show error state
            await waitFor(() => {
                expect(getByTestId('error')).toBeInTheDocument();
            });
        });
    });

    describe('Custom Filtering', () => {
        const customItems = [
            createMockCategory({
                id: 'cat-1',
                name: 'Category 1',
                onlineSubCategoriesCount: 2,
                c_customShowInMenu: true,
            }),
            createMockCategory({
                id: 'cat-2',
                name: 'Category 2',
                onlineSubCategoriesCount: 3,
                c_customShowInMenu: false,
            }),
            createMockCategory({
                id: 'cat-3',
                name: 'Category 3',
                onlineSubCategoriesCount: 0,
                c_customShowInMenu: true,
            }),
        ];

        it('should filter items using a custom filter key', async () => {
            renderComponent({
                resolve: Promise.resolve(
                    createMockCategoryWithChildren({ id: 'root', name: 'Root', categories: customItems })
                ),
                itemsFilter: 'c_customShowInMenu',
            });

            await waitFor(() => {
                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(1);
                expect(MockCategoryNavigationMenu).toHaveBeenCalledWith(
                    expect.objectContaining({
                        categories: expect.arrayContaining([
                            expect.objectContaining({ id: 'cat-1', name: 'Category 1' }),
                            expect.objectContaining({ id: 'cat-3', name: 'Category 3' }),
                        ]),
                    }),
                    undefined
                );
            });
        });

        it('should filter items using a custom filter function', async () => {
            const filterFn = vi.fn().mockReturnValue(false).mockReturnValue(true);

            renderComponent({
                resolve: Promise.resolve(
                    createMockCategoryWithChildren({ id: 'root', name: 'Root', categories: customItems })
                ),
                itemsFilter: filterFn,
            });

            await waitFor(() => {
                expect(filterFn).toHaveBeenCalledTimes(3);
                expect(filterFn).toHaveBeenNthCalledWith(1, customItems[0]);
                expect(filterFn).toHaveBeenNthCalledWith(2, customItems[1]);
                expect(filterFn).toHaveBeenNthCalledWith(3, customItems[2]);

                expect(MockCategoryNavigationMenu).toHaveBeenCalledTimes(1);
                expect(MockCategoryNavigationMenu).toHaveBeenCalledWith(
                    expect.objectContaining({
                        categories: expect.arrayContaining([
                            expect.objectContaining({ id: 'cat-2', name: 'Category 2' }),
                            expect.objectContaining({ id: 'cat-3', name: 'Category 3' }),
                        ]),
                    }),
                    undefined
                );
            });
        });
    });
});
