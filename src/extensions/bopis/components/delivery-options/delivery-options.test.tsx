import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { masterProduct } from '@/components/__mocks__/master-variant-product';
import DeliveryOptions from './delivery-options';

// Mock the hooks
vi.mock('@/extensions/bopis/hooks/use-delivery-options', () => ({
    useDeliveryOptions: vi.fn(),
}));

vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: vi.fn(),
}));

// Use the real PickupOrDelivery component - no mock needed

// Mock UI strings
vi.mock('@/extensions/bopis/temp-ui-string-bopis', () => ({
    default: {
        deliveryOptions: {
            title: 'Delivery Options',
            storeSelection: {
                pickUpIn: 'Pick up in',
                selectStore: 'Select Store',
                outOfStockAt: 'Out of stock at',
                inStockAt: 'In stock at',
            },
            pickupOrDelivery: {
                shipToAddress: 'Ship to Address',
                pickUpInStore: 'Pick up in Store',
            },
        },
    },
}));

// Use the mock product from __mocks__ directory
const mockProduct = masterProduct;

const mockStore = {
    id: 'store-123',
    name: 'Test Store',
    inventoryId: 'inventory-123',
};

describe('DeliveryOptions', () => {
    let mockSetSelectedDeliveryOption: ReturnType<typeof vi.fn>;
    let mockOpenStoreLocator: ReturnType<typeof vi.fn>;
    let mockUseDeliveryOptions: ReturnType<typeof vi.fn>;
    let mockUseStoreLocator: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked functions
        const { useDeliveryOptions } = await import('@/extensions/bopis/hooks/use-delivery-options');
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');

        mockUseDeliveryOptions = useDeliveryOptions as any;
        mockUseStoreLocator = useStoreLocator as any;

        // Setup mock functions
        mockSetSelectedDeliveryOption = vi.fn();
        mockOpenStoreLocator = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: vi.fn(),
        });

        // Mock useStoreLocator to return a selector function
        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });
    });

    it('renders with default props (no basketPickupStore)', () => {
        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByText('Delivery Options')).toBeInTheDocument();
        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByText('Pick up in')).toBeInTheDocument();
        expect(screen.getByText('Select Store')).toBeInTheDocument();
    });

    it('renders with product and quantity', () => {
        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={2} />
            </BrowserRouter>
        );

        expect(screen.getByText('Delivery Options')).toBeInTheDocument();
        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
        const { container } = render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} className="custom-class" />
            </BrowserRouter>
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('displays store selection message when no store is selected', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByText('Pick up in')).toBeInTheDocument();
        expect(screen.getByText('Select Store')).toBeInTheDocument();
    });

    it('displays in stock message when store is selected and in stock', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByText('In stock at')).toBeInTheDocument();
        expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    it('displays out of stock message when store is out of stock', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: true,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        expect(screen.getByText('Out of stock at')).toBeInTheDocument();
        expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    it('handles delivery option change to pickup', () => {
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const pickupRadio = screen.getByLabelText('Pick up in Store');
        fireEvent.click(pickupRadio);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('pickup');
    });

    it('handles delivery option change to delivery', () => {
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'pickup',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        fireEvent.click(deliveryRadio);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('delivery');
    });

    it('handles delivery option change without product', () => {
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        const pickupRadio = screen.getByLabelText('Pick up in Store');
        fireEvent.click(pickupRadio);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('pickup');
    });

    it('handles delivery option change without store inventory ID', () => {
        const storeWithoutInventory = { ...mockStore, inventoryId: undefined };
        const mockHandleDeliveryOptionChange = vi.fn();

        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'delivery',
            isStoreOutOfStock: false,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockHandleDeliveryOptionChange,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: storeWithoutInventory, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions product={mockProduct} quantity={1} />
            </BrowserRouter>
        );

        const pickupRadio = screen.getByLabelText('Pick up in Store');
        fireEvent.click(pickupRadio);

        expect(mockHandleDeliveryOptionChange).toHaveBeenCalledWith('pickup');
    });

    it('opens store locator when store selection button is clicked', () => {
        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        const storeButton = screen.getByText('Select Store');
        fireEvent.click(storeButton);

        expect(mockOpenStoreLocator).toHaveBeenCalled();
    });

    it('passes correct props to PickupOrDelivery component', () => {
        mockUseDeliveryOptions.mockReturnValue({
            selectedDeliveryOption: 'pickup',
            isStoreOutOfStock: true,
            isSiteOutOfStock: false,
            setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
            handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
        });

        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });

        render(
            <BrowserRouter>
                <DeliveryOptions quantity={1} />
            </BrowserRouter>
        );

        const pickupRadio = screen.getByLabelText('Pick up in Store');
        expect(pickupRadio).toBeDisabled();
    });

    describe('basket pickup store behavior', () => {
        it('hides title and radio options when basketPickupStore is provided', () => {
            mockUseDeliveryOptions.mockReturnValue({
                selectedDeliveryOption: 'pickup',
                isStoreOutOfStock: false,
                isSiteOutOfStock: false,
                setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
                handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
            });

            mockUseStoreLocator.mockImplementation((selector) => {
                const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
                return selector(mockStoreState);
            });

            render(
                <BrowserRouter>
                    <DeliveryOptions quantity={1} basketPickupStore={mockStore} />
                </BrowserRouter>
            );

            // Title and radio options should be hidden when basketPickupStore is provided
            expect(screen.queryByText('Delivery Options')).not.toBeInTheDocument();
            expect(screen.queryByTestId('delivery-option-select')).not.toBeInTheDocument();

            // Store message should still be visible
            expect(screen.getByText('In stock at')).toBeInTheDocument();
            expect(screen.getByText('Test Store')).toBeInTheDocument();
        });

        it('uses basketPickupStore instead of selected store when provided', () => {
            const basketStore = {
                id: 'basket-store-456',
                name: 'Basket Store',
                inventoryId: 'inventory-456',
            };

            mockUseDeliveryOptions.mockReturnValue({
                selectedDeliveryOption: 'pickup',
                isStoreOutOfStock: false,
                isSiteOutOfStock: false,
                setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
                handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
            });

            // Selected store is different from basket store
            mockUseStoreLocator.mockImplementation((selector) => {
                const mockStoreState = { selectedStoreInfo: mockStore, open: mockOpenStoreLocator };
                return selector(mockStoreState);
            });

            render(
                <BrowserRouter>
                    <DeliveryOptions quantity={1} basketPickupStore={basketStore} />
                </BrowserRouter>
            );

            // Should display basket store name, not selected store name
            expect(screen.getByText('Basket Store')).toBeInTheDocument();
            expect(screen.queryByText('Test Store')).not.toBeInTheDocument();
        });

        it('shows out of stock message for basket pickup store', () => {
            mockUseDeliveryOptions.mockReturnValue({
                selectedDeliveryOption: 'pickup',
                isStoreOutOfStock: true,
                isSiteOutOfStock: false,
                setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
                handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
            });

            mockUseStoreLocator.mockImplementation((selector) => {
                const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
                return selector(mockStoreState);
            });

            render(
                <BrowserRouter>
                    <DeliveryOptions quantity={1} basketPickupStore={mockStore} />
                </BrowserRouter>
            );

            expect(screen.getByText('Out of stock at')).toBeInTheDocument();
            expect(screen.getByText('Test Store')).toBeInTheDocument();
        });

        it('handles basketPickupStore without name by using ID', () => {
            const storeWithoutName = {
                id: 'store-no-name',
                inventoryId: 'inventory-789',
            };

            mockUseDeliveryOptions.mockReturnValue({
                selectedDeliveryOption: 'pickup',
                isStoreOutOfStock: false,
                isSiteOutOfStock: false,
                setSelectedDeliveryOption: mockSetSelectedDeliveryOption,
                handleDeliveryOptionChange: mockSetSelectedDeliveryOption,
            });

            mockUseStoreLocator.mockImplementation((selector) => {
                const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
                return selector(mockStoreState);
            });

            render(
                <BrowserRouter>
                    <DeliveryOptions quantity={1} basketPickupStore={storeWithoutName} />
                </BrowserRouter>
            );

            // Should display store ID when name is not available
            expect(screen.getByText('store-no-name')).toBeInTheDocument();
        });
    });
});
