// Testing libraries
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Components
import { CartItemEditModal } from './index';

// Mock data
import { variantProduct } from '@/components/__mocks__/master-variant-product';

// Utils
import uiStrings from '@/temp-ui-string';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// @sfdc-extension-block-start SFDC_EXT_BOPIS
import PickupProvider from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

// Mock useScapiFetcher to prevent actual API calls
const mockLoad = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        load: mockLoad,
        data: variantProduct,
        state: 'idle',
    })),
}));

const renderCartItemEditModal = (props: React.ComponentProps<typeof CartItemEditModal>) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <AllProvidersWrapper>
                        <CartItemEditModal {...props} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return { ...render(<RouterProvider router={router} />), router };
};

describe('CartItemEditModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        product: variantProduct,
        initialQuantity: 1,
        itemId: 'test-item-id',
    };

    test('renders modal when open is true', () => {
        renderCartItemEditModal(defaultProps);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.editItem.title)).toBeInTheDocument();
    });

    test('does not render modal when open is false', () => {
        renderCartItemEditModal({ ...defaultProps, open: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText(uiStrings.editItem.title)).not.toBeInTheDocument();
    });

    test('displays product name in modal content', () => {
        renderCartItemEditModal(defaultProps);

        expect(screen.getByText(variantProduct.name as string)).toBeInTheDocument();
    });

    test('calls onOpenChange when modal is closed', async () => {
        const user = userEvent.setup();
        const mockOnOpenChange = vi.fn();
        renderCartItemEditModal({ ...defaultProps, onOpenChange: mockOnOpenChange });

        // Find and click the close button
        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test('displays correct dialog title', () => {
        renderCartItemEditModal(defaultProps);

        expect(screen.getByText(uiStrings.editItem.title)).toBeInTheDocument();
    });

    test('maintains accessibility with proper ARIA attributes', () => {
        renderCartItemEditModal(defaultProps);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();

        // Check for dialog title
        const title = screen.getByText(uiStrings.editItem.title);
        expect(title).toBeInTheDocument();
    });

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    describe('pickup inventory fetching', () => {
        beforeEach(async () => {
            mockLoad.mockClear();
            // Reset the mock implementation
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            vi.mocked(useScapiFetcher).mockReturnValue({
                load: mockLoad,
                data: variantProduct,
                state: 'idle',
            });
        });

        test('includes inventoryIds when editing pickup item', async () => {
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            let capturedParameters: any = null;

            // Mock useScapiFetcher to capture parameters
            vi.mocked(useScapiFetcher).mockImplementation((_service, _method, options) => {
                capturedParameters = (options as any)?.parameters;
                return {
                    load: mockLoad,
                    data: variantProduct,
                    state: 'idle',
                };
            });

            // Setup pickup context with the item marked for pickup
            const initialPickupItems = new Map([
                ['variant-product-id', { inventoryId: 'inventory-store-123', storeId: 'store-123' }],
            ]);

            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <PickupProvider initialItems={initialPickupItems}>
                                <AllProvidersWrapper>
                                    <CartItemEditModal
                                        {...defaultProps}
                                        product={{ ...variantProduct, id: 'variant-product-id' }}
                                    />
                                </AllProvidersWrapper>
                            </PickupProvider>
                        ),
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );
            render(<RouterProvider router={router} />);

            // Check that inventoryIds parameter was included
            expect(capturedParameters).toBeDefined();
            expect(capturedParameters.inventoryIds).toEqual(['inventory-store-123']);
        });

        test('does not include inventoryIds when editing non-pickup item', async () => {
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            let capturedParameters: any = null;

            // Mock useScapiFetcher to capture parameters
            vi.mocked(useScapiFetcher).mockImplementation((_service, _method, options) => {
                capturedParameters = (options as any)?.parameters;
                return {
                    load: mockLoad,
                    data: variantProduct,
                    state: 'idle',
                };
            });

            // Setup pickup context without the item (not a pickup item)
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <PickupProvider initialItems={new Map()}>
                                <AllProvidersWrapper>
                                    <CartItemEditModal {...defaultProps} />
                                </AllProvidersWrapper>
                            </PickupProvider>
                        ),
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );
            render(<RouterProvider router={router} />);

            // Check that inventoryIds parameter was not included
            expect(capturedParameters).toBeDefined();
            expect(capturedParameters.inventoryIds).toBeUndefined();
        });

        test('works without pickup context', async () => {
            const { useScapiFetcher } = await import('@/hooks/use-scapi-fetcher');
            let capturedParameters: any = null;

            // Mock useScapiFetcher to capture parameters
            vi.mocked(useScapiFetcher).mockImplementation((_service, _method, options) => {
                capturedParameters = (options as any)?.parameters;
                return {
                    load: mockLoad,
                    data: variantProduct,
                    state: 'idle',
                };
            });

            // Render without PickupProvider (pickup context is null)
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <AllProvidersWrapper>
                                <CartItemEditModal {...defaultProps} />
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            );
            render(<RouterProvider router={router} />);

            // Should not crash and should not include inventoryIds
            expect(capturedParameters).toBeDefined();
            expect(capturedParameters.inventoryIds).toBeUndefined();
        });
    });
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
});
