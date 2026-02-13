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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewCardsSection from './review-cards-section';
import type { ReviewItem } from '@/lib/adapters/product-content-data-types';

const mockReview1: ReviewItem = {
    id: 'r1',
    authorName: 'Alice',
    verifiedPurchase: true,
    date: 'Jan 2025',
    rating: 5,
    headline: 'Great',
    body: 'Body one.',
    helpfulCount: 0,
};
const mockGetReviews = vi.fn();
const mockUseProductContent = vi.fn();
vi.mock('@/providers/product-context', () => ({
    useProduct: () => ({ id: 'product-123' }),
}));
vi.mock('@/hooks/product-content/use-product-content', () => ({
    useProductContent: (...args: unknown[]) => mockUseProductContent(...args),
}));

// Avoid image resolution in section's child ReviewCard
vi.mock('./review-card-images', () => ({
    REVIEW_CARD_IMAGES: {},
}));

describe('ReviewCardsSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseProductContent.mockReturnValue({
            adapter: { getReviews: mockGetReviews },
        });
    });

    it('shows coming soon when adapter returns no reviews', async () => {
        mockGetReviews.mockResolvedValue({ reviews: [] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText('Customer reviews coming soon.')).toBeInTheDocument();
        });
    });

    it('shows coming soon when adapter is undefined', async () => {
        mockUseProductContent.mockReturnValue({ adapter: undefined });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText('Customer reviews coming soon.')).toBeInTheDocument();
        });
    });

    it('fetches and displays reviews with showing X–Y of Z and pagination', async () => {
        const sevenReviews: ReviewItem[] = Array.from({ length: 7 }, (_, i) => ({
            ...mockReview1,
            id: `r${i}`,
            authorName: `User ${i}`,
            headline: `Headline ${i}`,
        }));
        mockGetReviews.mockResolvedValue({ reviews: sevenReviews });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-5 of 7 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('User 0')).toBeInTheDocument();
        expect(screen.getByText('Headline 0')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    });

    it('navigates to page 2 and updates showing range', async () => {
        const sixReviews: ReviewItem[] = Array.from({ length: 6 }, (_, i) => ({
            ...mockReview1,
            id: `r${i}`,
            authorName: `User ${i}`,
            headline: `Headline ${i}`,
        }));
        mockGetReviews.mockResolvedValue({ reviews: sixReviews });
        const user = userEvent.setup();
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(screen.getByText(/Showing 1-5 of 6 reviews/)).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: 'Page 2' }));
        await waitFor(() => {
            expect(screen.getByText(/Showing 6-6 of 6 reviews/)).toBeInTheDocument();
        });
        expect(screen.getByText('User 5')).toBeInTheDocument();
    });

    it('calls getReviews with product id', async () => {
        mockGetReviews.mockResolvedValue({ reviews: [mockReview1] });
        render(<ReviewCardsSection />);
        await waitFor(() => {
            expect(mockGetReviews).toHaveBeenCalledWith('product-123');
        });
    });
});
