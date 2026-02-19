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
import { vi, test, describe, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { DecoratedVariationAttribute } from '@/lib/product-utils';
import Swatches from './swatches';
import { ConfigWrapper } from '@/test-utils/config';

const mockColorAttributes: DecoratedVariationAttribute[] = [
    {
        id: 'color',
        name: 'Colour',
        values: [
            {
                value: 'navy',
                name: 'Navy',
                href: '/product/test?color=navy',
                swatch: { link: 'https://example.com/navy.jpg', disBaseLink: 'https://example.com/navy.jpg' },
            },
            {
                value: 'red',
                name: 'Red',
                href: '/product/test?color=red',
                swatch: { link: 'https://example.com/red.jpg', disBaseLink: 'https://example.com/red.jpg' },
            },
            {
                value: 'blue',
                name: 'Blue',
                href: '/product/test?color=blue',
                swatch: { link: 'https://example.com/blue.jpg', disBaseLink: 'https://example.com/blue.jpg' },
            },
            {
                value: 'black',
                name: 'Black',
                href: '/product/test?color=black',
                swatch: { link: 'https://example.com/black.jpg', disBaseLink: 'https://example.com/black.jpg' },
            },
        ],
    },
];

const defaultProps = {
    variationAttributes: mockColorAttributes,
    maxSwatches: 2,
    selectedAttributeValue: null,
    handleAttributeChange: vi.fn(),
    disableSwatchInteraction: false,
    swatchMode: 'click' as const,
};

// Swatch uses NavLink which requires a router context
const renderSwatches = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: <Swatches {...mergedProps} />,
            },
        ],
        { initialEntries: ['/test'] }
    );
    return render(
        <ConfigWrapper>
            <RouterProvider router={router} />
        </ConfigWrapper>
    );
};

describe('Swatches', () => {
    test('renders a swatch group with the correct aria label', () => {
        renderSwatches();

        const swatchGroup = screen.getByRole('radiogroup', { name: 'Colour' });
        expect(swatchGroup).toBeInTheDocument();
    });

    test('renders swatches limited by maxSwatches', () => {
        renderSwatches({ maxSwatches: 2 });

        const swatches = screen.getAllByRole('radio');
        expect(swatches).toHaveLength(2);
    });

    test('renders all swatches when maxSwatches is large enough', () => {
        renderSwatches({ maxSwatches: 4 });

        const swatches = screen.getAllByRole('radio');
        expect(swatches).toHaveLength(4);
    });

    test('shows overflow indicator (+N) when there are more swatches than maxSwatches', () => {
        // 4 colors, maxSwatches=2 → should show +2
        renderSwatches({ maxSwatches: 2 });

        const plusIndicator = screen.getByTitle('+2');
        expect(plusIndicator).toBeInTheDocument();
    });

    test('does not show overflow indicator when swatches fit within maxSwatches', () => {
        renderSwatches({ maxSwatches: 4 });

        const plusIndicator = screen.queryByTitle(/^\+\d+$/);
        expect(plusIndicator).not.toBeInTheDocument();
    });

    test('calls handleAttributeChange when a swatch is clicked', async () => {
        const handleAttributeChange = vi.fn();
        const user = userEvent.setup();
        renderSwatches({ handleAttributeChange });

        const swatches = screen.getAllByRole('radio');
        await user.click(swatches[0]);

        expect(handleAttributeChange).toHaveBeenCalledWith('navy');
    });

    test('allows switching between swatches', async () => {
        const handleAttributeChange = vi.fn();
        const user = userEvent.setup();
        renderSwatches({ handleAttributeChange });

        const swatches = screen.getAllByRole('radio');
        await user.click(swatches[1]);
        expect(handleAttributeChange).toHaveBeenCalledWith('red');

        await user.click(swatches[0]);
        expect(handleAttributeChange).toHaveBeenCalledWith('navy');
    });

    test('marks the selected swatch', () => {
        renderSwatches({ selectedAttributeValue: 'red' });

        const swatches = screen.getAllByRole('radio');
        // The second swatch (red) should be checked
        expect(swatches[1]).toBeChecked();
        expect(swatches[0]).not.toBeChecked();
    });

    test('renders only the selected variant swatch in read-only wishlist mode', () => {
        renderSwatches({
            disableSwatchInteraction: true,
            selectedVariantColorValue: 'navy',
        });

        const swatches = screen.getAllByRole('radio');
        expect(swatches).toHaveLength(1);
    });

    test('does not show overflow indicator in read-only wishlist mode', () => {
        renderSwatches({
            disableSwatchInteraction: true,
            selectedVariantColorValue: 'navy',
        });

        const plusIndicator = screen.queryByTitle(/^\+\d+$/);
        expect(plusIndicator).not.toBeInTheDocument();
    });

    test('does not render swatches when variationAttributes is empty', () => {
        renderSwatches({
            variationAttributes: [],
        });

        const swatchGroup = screen.queryByRole('radiogroup');
        expect(swatchGroup).not.toBeInTheDocument();
    });

    test('renders color swatches with background image styles', () => {
        const { container } = renderSwatches();

        // Color swatches should have background image divs
        const swatchImage = container.querySelector('[aria-label="Navy"].bg-no-repeat');
        expect(swatchImage).toBeInTheDocument();
        expect(swatchImage).toHaveStyle({ backgroundImage: 'url(https://example.com/navy.jpg)' });
    });
});
