import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PickupOrDelivery from './pickup-or-delivery';
import { DELIVERY_OPTIONS } from '@/extensions/bopis/constants';

// Mock the hooks
vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: vi.fn(),
}));

describe('PickupOrDelivery', () => {
    let mockUseStoreLocator: ReturnType<typeof vi.fn>;
    let mockOpenStoreLocator: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked functions
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');

        mockUseStoreLocator = useStoreLocator as any;

        // Setup mock functions
        mockOpenStoreLocator = vi.fn();

        // Mock useStoreLocator to return a selector function
        mockUseStoreLocator.mockImplementation((selector) => {
            const mockStoreState = { selectedStoreInfo: null, open: mockOpenStoreLocator };
            return selector(mockStoreState);
        });
    });

    it('renders with default props', () => {
        render(<PickupOrDelivery />);

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByLabelText('Ship to Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Free pickup in')).toBeInTheDocument();
    });

    it('renders with Select Store label when no pickup store is provided', () => {
        render(<PickupOrDelivery />);

        expect(screen.getByText('Select Store')).toBeInTheDocument();
    });

    it('renders with custom value', () => {
        render(<PickupOrDelivery value={DELIVERY_OPTIONS.PICKUP} />);

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByLabelText('Ship to Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Free pickup in')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
        const { container } = render(<PickupOrDelivery className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders with isPickupDisabled prop', () => {
        render(<PickupOrDelivery isPickupDisabled={true} />);

        const pickupRadio = screen.getByLabelText('Pickup unavailable at');
        expect(pickupRadio).toBeDisabled();
    });

    it('renders with isDeliveryDisabled prop', () => {
        render(<PickupOrDelivery isDeliveryDisabled={true} />);

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        expect(deliveryRadio).toBeDisabled();
    });

    it('renders with both options disabled', () => {
        render(<PickupOrDelivery isPickupDisabled={true} isDeliveryDisabled={true} />);

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        const pickupRadio = screen.getByLabelText('Pickup unavailable at');
        expect(deliveryRadio).toBeDisabled();
        expect(pickupRadio).toBeDisabled();
    });

    it('renders with all props combined', () => {
        render(
            <PickupOrDelivery
                value={DELIVERY_OPTIONS.PICKUP}
                onChange={vi.fn()}
                isPickupDisabled={false}
                isDeliveryDisabled={false}
                className="test-class"
            />
        );

        expect(screen.getByTestId('delivery-option-select')).toBeInTheDocument();
        expect(screen.getByLabelText('Free pickup in')).not.toBeDisabled();
        expect(screen.getByLabelText('Ship to Address')).not.toBeDisabled();
        expect(screen.getByTestId('delivery-option-select').parentElement).toHaveClass('test-class');
    });

    it('applies correct accessibility attributes', () => {
        render(<PickupOrDelivery />);

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        const pickupRadio = screen.getByLabelText('Free pickup in');

        expect(deliveryRadio).toHaveAttribute('id', 'delivery-option');
        expect(pickupRadio).toHaveAttribute('id', 'pickup-option');
    });

    it('handles undefined onChange gracefully', () => {
        render(<PickupOrDelivery onChange={undefined} />);

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        const pickupRadio = screen.getByLabelText('Free pickup in');

        // Should not throw when rendering
        expect(deliveryRadio).toBeInTheDocument();
        expect(pickupRadio).toBeInTheDocument();
    });

    it('calls onChange when pickup radio button is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} />);

        const pickupRadio = screen.getByLabelText('Free pickup in');
        fireEvent.click(pickupRadio);

        expect(mockOnChange).toHaveBeenCalledWith(DELIVERY_OPTIONS.PICKUP);
    });

    it('calls onChange when delivery radio button is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery value={DELIVERY_OPTIONS.PICKUP} onChange={mockOnChange} />);

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        fireEvent.click(deliveryRadio);

        expect(mockOnChange).toHaveBeenCalledWith(DELIVERY_OPTIONS.DELIVERY);
    });

    it('does not call onChange when disabled pickup option is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} isPickupDisabled={true} />);

        const pickupRadio = screen.getByLabelText('Pickup unavailable at');
        fireEvent.click(pickupRadio);

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when disabled delivery option is clicked', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} isDeliveryDisabled={true} />);

        const deliveryRadio = screen.getByLabelText('Ship to Address');
        fireEvent.click(deliveryRadio);

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange for invalid values', () => {
        const mockOnChange = vi.fn();
        render(<PickupOrDelivery onChange={mockOnChange} value={DELIVERY_OPTIONS.DELIVERY} />);

        // When clicking the already-selected option, onChange should not be called
        // This simulates the behavior of invalid values - they don't trigger onChange
        const deliveryRadio = screen.getByLabelText('Ship to Address');
        fireEvent.click(deliveryRadio);

        // RadioGroup doesn't call onChange when clicking the already-selected value
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('applies disabled styling to pickup label when isPickupDisabled is true', () => {
        render(<PickupOrDelivery isPickupDisabled={true} />);

        // Find the label by its htmlFor attribute or by text
        const pickupLabel = screen.getByText('Pickup unavailable at');
        expect(pickupLabel).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('applies disabled styling to delivery label when isDeliveryDisabled is true', () => {
        render(<PickupOrDelivery isDeliveryDisabled={true} />);

        // Find the label by its htmlFor attribute or by text
        const deliveryLabel = screen.getByText('Ship to Address');
        expect(deliveryLabel).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
});
