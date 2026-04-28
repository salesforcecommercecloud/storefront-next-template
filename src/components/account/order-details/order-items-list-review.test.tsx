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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { OrderItemsList, type OrderItemsListProps } from './order-items-list';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { ConfigWrapper, mockConfig, mockLocale } from '@/test-utils/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import ProductContentProvider from '@/providers/product-content';

const mockSite = mockConfig.commerce.sites[0];
const { t } = getTranslation();

vi.mock('@/components/info-modal', () => ({
    default: ({ open }: { open: boolean }) => (open ? <div data-testid="info-modal-mock">modal-open</div> : null),
}));

vi.mock('@/hooks/product-content/use-product-content', () => ({
    useProductContent: () => ({
        adapter: {
            getWriteReviewForm: () =>
                Promise.resolve({
                    title: 'Write a Review',
                    overallRating: { label: 'Overall Rating', required: true, placeholder: 'Select' },
                    reviewTitle: { label: 'Review Title', placeholder: 'Summarize', maxCharacters: 250 },
                    reviewBody: {
                        label: 'Your Review',
                        placeholder: 'Your thoughts',
                        minCharacters: 50,
                        maxCharacters: 2000,
                    },
                    recommend: { label: 'Recommend?', yesLabel: 'Yes', noLabel: 'No' },
                    addPhotos: { label: 'Add Photos', hint: 'Click', accept: 'PNG', maxSize: '5MB' },
                    termsText: 'Terms.',
                    cancelLabel: 'Cancel',
                    submitLabel: 'Submit Review',
                }),
        },
        isEnabled: true,
    }),
}));

const minimalProduct = {
    id: '701643108633M',
    name: 'Sweater',
    variationAttributes: [],
    variationValues: {},
};

function renderWithReviewOptions(props: OrderItemsListProps) {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <ConfigWrapper>
                        <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="USD">
                            <ProductContentProvider>
                                <OrderItemsList orderNo="TEST-ORDER" {...props} />
                            </ProductContentProvider>
                        </SiteProvider>
                    </ConfigWrapper>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
}

describe('OrderItemsList (rate & review)', () => {
    const lineItem = {
        itemId: 'line-a',
        productId: '701643108633M',
        productName: 'Sweater',
        quantity: 1,
        basePrice: 10,
        price: 10,
        priceAfterItemDiscount: 10,
        shipmentId: 'me',
    };

    test('does not render line review controls when review props are omitted', () => {
        renderWithReviewOptions({
            items: [lineItem],
            productsById: { '701643108633M': minimalProduct },
        });
        expect(screen.queryByTestId('order-line-rate-review')).not.toBeInTheDocument();
    });

    test('renders Rate & Review when product data exists and callbacks are provided', async () => {
        renderWithReviewOptions({
            items: [lineItem],
            productsById: { '701643108633M': minimalProduct },
            submittedReviewLineKeys: new Set(),
            onOrderLineReviewSubmitted: vi.fn(),
        });
        await waitFor(() => {
            expect(screen.getByTestId('order-line-rate-review')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: t('account:orders.rateAndReview') })).toBeInTheDocument();
    });

    test('renders Review submitted when line key is in submitted set', () => {
        renderWithReviewOptions({
            items: [lineItem],
            productsById: { '701643108633M': minimalProduct },
            submittedReviewLineKeys: new Set(['line-a']),
            onOrderLineReviewSubmitted: vi.fn(),
        });
        expect(screen.getByText(t('account:orders.reviewSubmitted'))).toBeInTheDocument();
        expect(screen.queryByTestId('order-line-rate-review')).not.toBeInTheDocument();
    });

    test('does not render review controls when product is missing from productsById', () => {
        renderWithReviewOptions({
            items: [lineItem],
            productsById: {},
            submittedReviewLineKeys: new Set(),
            onOrderLineReviewSubmitted: vi.fn(),
        });
        expect(screen.queryByTestId('order-line-rate-review')).not.toBeInTheDocument();
    });

    test('opens lazy review modal when Rate & Review is clicked', async () => {
        const user = userEvent.setup();
        renderWithReviewOptions({
            items: [lineItem],
            productsById: { '701643108633M': minimalProduct },
            submittedReviewLineKeys: new Set(),
            onOrderLineReviewSubmitted: vi.fn(),
        });
        await waitFor(() => expect(screen.getByTestId('order-line-rate-review')).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: t('account:orders.rateAndReview') }));
        await waitFor(() => {
            expect(screen.getByTestId('info-modal-mock')).toBeInTheDocument();
        });
    });
});
