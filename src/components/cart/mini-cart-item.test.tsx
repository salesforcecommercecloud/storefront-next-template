/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CurrencyProvider } from '@/providers/currency';
import MiniCartItem from './mini-cart-item';

// Helper function to render with Router and Currency context
const renderWithRouter = (ui: React.ReactElement, currency: string = 'USD') => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: <CurrencyProvider value={currency}>{ui}</CurrencyProvider>,
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return render(<RouterProvider router={router} />);
};

// Mock the hooks
vi.mock('@/hooks/use-item-fetcher', () => ({
    useItemFetcher: () => ({
        state: 'idle',
        submit: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-cart-quantity-update', () => ({
    useCartQuantityUpdate: () => ({
        quantity: 1,
        handleQuantityChange: vi.fn(),
    }),
}));

vi.mock('@/config', () => ({
    useConfig: () => ({
        pages: {
            cart: {
                quantityUpdateDebounce: 500,
                maxQuantityPerItem: 10,
            },
        },
    }),
}));

const mockProduct = {
    itemId: '1',
    productId: 'prod-1',
    productName: 'Test Product',
    quantity: 1,
    basePrice: 20.0,
    price: 20.0,
    priceAfterItemDiscount: 15.0,
    variationValues: {
        color: 'Grey',
        size: 'XL',
    },
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [{ value: 'Grey', name: 'Grey' }],
        },
        {
            id: 'size',
            name: 'Size',
            values: [
                { value: 'XL', name: 'XL' },
                { value: 'M', name: 'M' },
            ],
        },
    ],
    imageGroups: [
        {
            viewType: 'small',
            images: [
                {
                    link: 'https://via.placeholder.com/160',
                    alt: 'Product image',
                },
            ],
        },
    ],
};

describe('MiniCartItem', () => {
    it('renders product name', () => {
        renderWithRouter(<MiniCartItem product={mockProduct} />);
        expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('renders variation attributes', () => {
        renderWithRouter(<MiniCartItem product={mockProduct} />);
        expect(
            screen.getByText((content, element) => {
                return element?.textContent === 'Color: Grey';
            })
        ).toBeInTheDocument();
        expect(
            screen.getByText((content, element) => {
                return element?.textContent === 'Size: XL';
            })
        ).toBeInTheDocument();
    });

    it('renders pricing with savings', () => {
        renderWithRouter(<MiniCartItem product={mockProduct} />);
        expect(screen.getByText('$20.00')).toBeInTheDocument();
        expect(screen.getByText('$15.00')).toBeInTheDocument();
        // Strikethrough shows savings, badge only shows if there are promotions
    });

    it('renders pricing without savings when prices are equal', () => {
        const productWithoutSavings = {
            ...mockProduct,
            basePrice: 15.0,
            price: 15.0,
            priceAfterItemDiscount: 15.0,
        };
        renderWithRouter(<MiniCartItem product={productWithoutSavings} />);
        expect(screen.getByText('$15.00')).toBeInTheDocument();
        expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
    });

    it('renders product image', () => {
        renderWithRouter(<MiniCartItem product={mockProduct} />);
        const img = screen.getByAltText('Product image');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', expect.stringContaining('placeholder.com'));
    });

    it('renders placeholder when no image', () => {
        const productWithoutImage = {
            ...mockProduct,
            imageGroups: [],
        };
        renderWithRouter(<MiniCartItem product={productWithoutImage} />);
        expect(screen.getByText('No image')).toBeInTheDocument();
    });

    it('renders quantity selector as dropdown', () => {
        renderWithRouter(<MiniCartItem product={mockProduct} />);
        expect(screen.getByText('Quantity:')).toBeInTheDocument();
        const select = screen.getByLabelText('Quantity');
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue('1');
        // Check that dropdown has options 1-10 plus Custom option
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(11); // 1-10 plus "Custom..."
        expect(screen.getByText('Custom...')).toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        renderWithRouter(<MiniCartItem product={mockProduct} onRemove={onRemove} />);

        const removeButton = screen.getByRole('button', { name: /remove item/i });
        await user.click(removeButton);

        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('renders only color when size is not present', () => {
        const productWithOnlyColor = {
            ...mockProduct,
            variationValues: {
                color: 'Blue',
            },
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [{ value: 'Blue', name: 'Blue' }],
                },
            ],
        };
        renderWithRouter(<MiniCartItem product={productWithOnlyColor} />);
        expect(
            screen.getByText((content, element) => {
                return (
                    element?.textContent === 'Color: Blue' &&
                    element?.className?.includes('inline-block') &&
                    element?.className?.includes('w-full')
                );
            })
        ).toBeInTheDocument();
        expect(
            screen.queryByText((content, element) => {
                return element?.textContent?.includes('Size:') || false;
            })
        ).not.toBeInTheDocument();
    });

    it('renders only size when color is not present', () => {
        const productWithOnlySize = {
            ...mockProduct,
            variationValues: {
                size: 'M',
            },
            variationAttributes: [
                {
                    id: 'size',
                    name: 'Size',
                    values: [{ value: 'M', name: 'M' }],
                },
            ],
        };
        renderWithRouter(<MiniCartItem product={productWithOnlySize} />);
        expect(
            screen.getByText((content, element) => {
                return (
                    element?.textContent === 'Size: M' &&
                    element?.className?.includes('inline-block') &&
                    element?.className?.includes('w-full')
                );
            })
        ).toBeInTheDocument();
        expect(
            screen.queryByText((content, element) => {
                return element?.textContent?.includes('Color:') || false;
            })
        ).not.toBeInTheDocument();
    });

    it('switches to custom input when Custom option is selected', async () => {
        const user = userEvent.setup();
        renderWithRouter(<MiniCartItem product={mockProduct} />);

        const select = screen.getByLabelText('Quantity');
        await user.selectOptions(select, 'custom');

        // Should now show an input field
        const input = screen.getByLabelText('Custom quantity');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue(1);
    });
});
