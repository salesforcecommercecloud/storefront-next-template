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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { StarRatingDistributionModalContent } from '../../star-rating-distribution-modal-content';
import type { RatingDistributionData } from '../../../types';

const typicalDistributions: RatingDistributionData[] = [
    { rating: 5, count: 120 },
    { rating: 4, count: 50 },
    { rating: 3, count: 20 },
    { rating: 2, count: 8 },
    { rating: 1, count: 2 },
];

const highlyRatedDistributions: RatingDistributionData[] = [
    { rating: 5, count: 180 },
    { rating: 4, count: 15 },
    { rating: 3, count: 3 },
    { rating: 2, count: 1 },
    { rating: 1, count: 1 },
];

function StarRatingDistributionModalContentWrapper({
    rating,
    reviewCount,
    distributions,
    onSeeReviewsClick,
}: {
    rating: number;
    reviewCount: number;
    distributions: RatingDistributionData[];
    onSeeReviewsClick?: () => void;
}) {
    return (
        <div className="w-64 p-6 bg-background rounded-lg border">
            <StarRatingDistributionModalContent
                rating={rating}
                reviewCount={reviewCount}
                distributions={distributions}
                onSeeReviewsClick={onSeeReviewsClick}
            />
        </div>
    );
}

const meta: Meta<typeof StarRatingDistributionModalContentWrapper> = {
    title: 'Components/Product Ratings/Star Rating Distribution Modal Content',
    component: StarRatingDistributionModalContentWrapper,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
StarRatingDistributionModalContent is a renderer component that displays star rating and distribution content within the InfoModal.

This component is used internally by InfoModal when the modal type is 'star-rating-distribution'. It renders:

- **Star Rating**: Uses the RatingOnRatingModal style configuration (right label, full format, review count label)
- **Rating Distributions**: Displays the distribution of ratings across 1-5 stars
- **See Reviews Button**: Optional link button to navigate to reviews (follows project pattern: text-primary hover:underline)
- **Width**: Designed to fit within a w-64 (256px) container

The layout stacks the star rating component on top of the rating distributions component with equal spacing, followed by an optional "See customer reviews" link button.
                `,
            },
        },
    },
    argTypes: {
        rating: {
            control: { type: 'range', min: 0, max: 5, step: 0.1 },
            description: 'The overall rating value (0-5)',
        },
        reviewCount: {
            control: { type: 'number', min: 0 },
            description: 'The total number of reviews',
        },
        distributions: {
            control: 'object',
            description: 'Array of rating distribution data for 1-5 stars',
        },
        onSeeReviewsClick: {
            control: false,
            description: 'Optional callback when "See customer reviews" button is clicked',
        },
    },
};

export default meta;

type Story = StoryObj<typeof StarRatingDistributionModalContentWrapper>;

export const Default: Story = {
    args: {
        rating: 4.8,
        reviewCount: 200,
        distributions: typicalDistributions,
        onSeeReviewsClick: action('see reviews clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Default star rating distribution modal content with typical distribution data.

### Features:
- Overall rating of 4.8 with 200 reviews
- Rating distributions showing most reviews are 5-star
- Clean layout with star rating on top and distributions below
- Content width: w-64 (256px)
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that star rating is displayed with right label
        const ratingLabel = canvas.getByText('4.8 out of 5');
        await expect(ratingLabel).toBeInTheDocument();

        // Test that review count label is displayed
        const reviewCountLabel = canvas.getByText('Based on 200 reviews');
        await expect(reviewCountLabel).toBeInTheDocument();

        // Test that stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBeGreaterThan(5); // Should have stars in both components
    },
};

export const HighlyRated: Story = {
    args: {
        rating: 4.9,
        reviewCount: 200,
        distributions: highlyRatedDistributions,
        onSeeReviewsClick: action('see reviews clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Highly rated product with most reviews being 5-star.

### Features:
- Overall rating of 4.9 with 200 reviews
- Distribution heavily skewed towards 5-star reviews
- Demonstrates how the component handles excellent ratings
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that star rating is displayed with right label
        const ratingLabel = canvas.getByText('4.9 out of 5');
        await expect(ratingLabel).toBeInTheDocument();
    },
};

export const ModerateRating: Story = {
    args: {
        rating: 3.5,
        reviewCount: 150,
        distributions: [
            { rating: 5, count: 30 },
            { rating: 4, count: 40 },
            { rating: 3, count: 35 },
            { rating: 2, count: 25 },
            { rating: 1, count: 20 },
        ],
        onSeeReviewsClick: action('see reviews clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with moderate rating showing balanced distribution.

### Features:
- Overall rating of 3.5 with 150 reviews
- More evenly distributed reviews across all star ratings
- Demonstrates how the component handles mixed reviews
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that star rating is displayed with right label
        const ratingLabel = canvas.getByText('3.5 out of 5');
        await expect(ratingLabel).toBeInTheDocument();
    },
};

export const LargeReviewCount: Story = {
    args: {
        rating: 4.7,
        reviewCount: 12345,
        distributions: [
            { rating: 5, count: 6789 },
            { rating: 4, count: 3456 },
            { rating: 3, count: 1234 },
            { rating: 2, count: 567 },
            { rating: 1, count: 299 },
        ],
        onSeeReviewsClick: action('see reviews clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with large number of reviews demonstrating scale.

### Features:
- Overall rating of 4.7 with 12,345 reviews
- Large numbers in distribution bars
- Tests component layout with high review counts
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that star rating is displayed with right label
        const ratingLabel = canvas.getByText('4.7 out of 5');
        await expect(ratingLabel).toBeInTheDocument();

        // Test that large review count is displayed
        const reviewCountLabel = canvas.getByText('Based on 12,345 reviews');
        await expect(reviewCountLabel).toBeInTheDocument();
    },
};
