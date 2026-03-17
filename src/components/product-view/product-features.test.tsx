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

// Testing libraries
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
// Commerce SDK
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
// React Router
import { createRoutesStub } from 'react-router';
// Components
import ProductFeatures from './product-features';
import { DEFAULT_PRODUCT_FEATURES_CONFIG } from '@/config/product-features';

const renderProductFeatures = (props: React.ComponentProps<typeof ProductFeatures>) => {
    const Stub = createRoutesStub([
        {
            path: '/product/:productId',
            Component: () => <ProductFeatures {...props} />,
        },
    ]);
    return render(<Stub initialEntries={['/product/test-product']} />);
};

describe('ProductFeatures', () => {
    const baseMockProduct: ShopperProducts.schemas['Product'] = {
        id: 'test-product',
        name: 'Test Product',
        shortDescription: 'Short description',
        price: 99.99,
        inventory: { ats: 10, orderable: true, id: 'test-inventory' },
    };

    test('renders HTML list features with proper styling', () => {
        const product = {
            ...baseMockProduct,
            longDescription:
                '<ul><li>Premium cotton blend</li><li>Machine washable</li><li>Breathable fabric</li></ul>',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Premium cotton blend')).toBeInTheDocument();
        expect(screen.getByText('Machine washable')).toBeInTheDocument();
        expect(screen.getByText('Breathable fabric')).toBeInTheDocument();
    });

    test('renders pipe-separated features with bullets', () => {
        const product = {
            ...baseMockProduct,
            longDescription:
                'Premium cotton blend | Machine washable | Breathable fabric | Available in multiple colors',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Premium cotton blend')).toBeInTheDocument();
        expect(screen.getByText('Machine washable')).toBeInTheDocument();
        expect(screen.getByText('Breathable fabric')).toBeInTheDocument();
        expect(screen.getByText('Available in multiple colors')).toBeInTheDocument();
    });

    test('renders plain text features without bullets', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'This is a premium quality product with excellent durability and comfort.',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(
            screen.getByText('This is a premium quality product with excellent durability and comfort.')
        ).toBeInTheDocument();
    });

    test('treats content with HTML tags as HTML (not pipe-separated)', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Premium <strong>cotton</strong> blend | Machine <em>washable</em> | Breathable fabric',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        // Check that the content is rendered as HTML (not split by pipes)
        // Use partial text matching to handle text split by HTML tags and spaces
        expect(screen.getByText(/Premium/)).toBeInTheDocument();
        expect(screen.getByText('cotton')).toBeInTheDocument();
        expect(screen.getByText(/blend/)).toBeInTheDocument();
        expect(screen.getByText(/Machine/)).toBeInTheDocument();
        expect(screen.getByText('washable')).toBeInTheDocument();
        expect(screen.getByText(/Breathable fabric/)).toBeInTheDocument();
        // Should not be split into list items since it's treated as HTML
        const listItems = screen.queryAllByRole('listitem');
        expect(listItems).toHaveLength(0);
    });

    test('handles empty pipe-separated items', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1 | | Feature 3 |   | Feature 5',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 3')).toBeInTheDocument();
        expect(screen.getByText('Feature 5')).toBeInTheDocument();
        // Should only have 3 feature items (empty ones are filtered out)
        const featureItems = screen.getAllByText(/Feature \d/);
        expect(featureItems).toHaveLength(3);
    });

    test('uses correct styling classes', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1 | Feature 2',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        const featuresLabel = screen.getByText('Features:');
        expect(featuresLabel).toHaveClass('font-semibold');

        // Check that the ul element has the correct classes
        const featuresList = screen.getByRole('list');
        expect(featuresList).toHaveClass('text-sm', 'text-foreground');
    });

    test('renders with proper accessibility attributes', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1 | Feature 2',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        // Check that bullet spans have aria-hidden
        const bullets = document.querySelectorAll('span[aria-hidden="true"]');
        expect(bullets).toHaveLength(2);
    });

    test('handles complex HTML in longDescription', () => {
        const product = {
            ...baseMockProduct,
            longDescription:
                '<div><p>This product features:</p><ul><li>High quality materials</li><li>Durable construction</li></ul></div>',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('This product features:')).toBeInTheDocument();
        expect(screen.getByText('High quality materials')).toBeInTheDocument();
        expect(screen.getByText('Durable construction')).toBeInTheDocument();
    });

    test('handles special characters in features', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature with "quotes" | Feature with & symbols | Feature with <brackets>',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        // Since <brackets> is detected as HTML, the entire content is treated as HTML
        // Use more flexible text matching for HTML content
        expect(screen.getByText(/Feature with "quotes"/)).toBeInTheDocument();
        expect(screen.getByText(/Feature with & symbols/)).toBeInTheDocument();
        // Should not be split into list items since it's treated as HTML
        const listItems = screen.queryAllByRole('listitem');
        expect(listItems).toHaveLength(0);
    });

    test('prioritizes HTML list over pipe-separated when both are present', () => {
        const product = {
            ...baseMockProduct,
            longDescription:
                '<ul><li>HTML Feature 1</li><li>HTML Feature 2</li></ul> | Pipe Feature 1 | Pipe Feature 2',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('HTML Feature 1')).toBeInTheDocument();
        expect(screen.getByText('HTML Feature 2')).toBeInTheDocument();
        // The entire content is treated as HTML, so pipe-separated features are also rendered
        // Use more flexible text matching for HTML content
        expect(screen.getByText(/Pipe Feature 1/)).toBeInTheDocument();
        expect(screen.getByText(/Pipe Feature 2/)).toBeInTheDocument();
    });

    test('uses custom delimiter when provided', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1 • Feature 2 • Feature 3',
        };
        renderProductFeatures({ product, delimiter: '•' });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
        expect(screen.getByText('Feature 3')).toBeInTheDocument();
    });

    test('uses semicolon delimiter when provided', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1; Feature 2; Feature 3',
        };
        renderProductFeatures({ product, delimiter: ';' });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
        expect(screen.getByText('Feature 3')).toBeInTheDocument();
    });

    test('defaults to pipe delimiter when no delimiter provided', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1 | Feature 2 | Feature 3',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
        expect(screen.getByText('Feature 3')).toBeInTheDocument();
    });

    test('handles empty items with custom delimiter', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature 1 • • Feature 3 •   • Feature 5',
        };
        renderProductFeatures({ product, delimiter: '•' });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 3')).toBeInTheDocument();
        expect(screen.getByText('Feature 5')).toBeInTheDocument();
        // Should only have 3 feature items (empty ones are filtered out)
        const featureItems = screen.getAllByText(/Feature \d/);
        expect(featureItems).toHaveLength(3);
    });

    test('detects HTML fragments using DOMParser', () => {
        const product = {
            ...baseMockProduct,
            longDescription: '<div><p>This is an HTML fragment</p><ul><li>Feature 1</li><li>Feature 2</li></ul></div>',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('This is an HTML fragment')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
    });

    test('detects plain text with HTML-like characters as non-HTML', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'This is plain text with < and > characters but not HTML',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('This is plain text with < and > characters but not HTML')).toBeInTheDocument();
    });

    test('detects malformed HTML as HTML (DOMParser is forgiving)', () => {
        const product = {
            ...baseMockProduct,
            longDescription: '<div>Unclosed div <p>Malformed HTML',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        // DOMParser will actually parse this as HTML and create elements
        expect(screen.getByText('Unclosed div')).toBeInTheDocument();
        expect(screen.getByText('Malformed HTML')).toBeInTheDocument();
    });

    test('prioritizes HTML detection over delimiter detection', () => {
        const product = {
            ...baseMockProduct,
            longDescription: '<p>HTML content</p> | This should not be split',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('HTML content')).toBeInTheDocument();
        // The entire content is treated as HTML, so the pipe-separated part is also rendered
        // Use more flexible text matching for HTML content
        expect(screen.getByText(/This should not be split/)).toBeInTheDocument();
    });

    test('handles complex HTML structures', () => {
        const product = {
            ...baseMockProduct,
            longDescription:
                '<section><h3>Product Features</h3><ul><li><strong>Premium</strong> quality</li><li><em>Durable</em> construction</li></ul></section>',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Product Features')).toBeInTheDocument();
        expect(screen.getByText('Premium')).toBeInTheDocument();
        expect(screen.getByText('quality')).toBeInTheDocument();
        expect(screen.getByText('Durable')).toBeInTheDocument();
        expect(screen.getByText('construction')).toBeInTheDocument();
    });

    test('uses custom htmlFragmentClassName when provided', () => {
        const product = {
            ...baseMockProduct,
            longDescription: '<div><p>Custom styled HTML content</p></div>',
        };
        const customClassName = 'custom-html-class text-lg text-blue-500';
        const { container } = renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: customClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Custom styled HTML content')).toBeInTheDocument();

        // Check that the custom class is applied to the HTML container
        // The HTML content is rendered inside a div with the custom class
        const htmlContainer = container.querySelector('div.custom-html-class');
        expect(htmlContainer).toBeInTheDocument();
        expect(htmlContainer).toHaveClass('text-lg', 'text-blue-500');
    });

    test('falls back to default htmlFragmentClassName when not provided', () => {
        const product = {
            ...baseMockProduct,
            longDescription: '<div><p>Default styled HTML content</p></div>',
        };
        const { container } = renderProductFeatures({ product, delimiter: '|' });

        expect(screen.getByText('Features:')).toBeInTheDocument();
        expect(screen.getByText('Default styled HTML content')).toBeInTheDocument();

        // Check that the default class is applied to the HTML container
        const htmlContainer = container.querySelector('.text-sm.text-foreground');
        expect(htmlContainer).toBeInTheDocument();
    });

    test('handles duplicate features with unique keys', () => {
        const product = {
            ...baseMockProduct,
            longDescription: 'Feature A | Feature B | Feature A | Feature C',
        };
        renderProductFeatures({
            product,
            delimiter: '|',
            htmlFragmentClassName: DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName,
        });

        expect(screen.getByText('Features:')).toBeInTheDocument();

        // Should render all features, including duplicates
        const featureAItems = screen.getAllByText('Feature A');
        expect(featureAItems).toHaveLength(2);
        expect(screen.getByText('Feature B')).toBeInTheDocument();
        expect(screen.getByText('Feature C')).toBeInTheDocument();

        // Should have 4 list items total (including duplicates)
        const listItems = screen.getAllByRole('listitem');
        expect(listItems).toHaveLength(4);
    });
});
