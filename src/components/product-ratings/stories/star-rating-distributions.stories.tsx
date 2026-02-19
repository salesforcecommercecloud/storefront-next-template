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
import { StarRatingDistributions } from '../star-rating-distributions';

const meta = {
    title: 'Components/Product Ratings/Star Rating Distributions',
    component: StarRatingDistributions,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        distributions: {
            description: 'Array of rating distribution data',
        },
    },
} satisfies Meta<typeof StarRatingDistributions>;

export default meta;
type Story = StoryObj<typeof meta>;

const typicalDistributions = [
    { rating: 5, count: 120 },
    { rating: 4, count: 50 },
    { rating: 3, count: 20 },
    { rating: 2, count: 8 },
    { rating: 1, count: 2 },
];

const perfectRatingDistributions = [
    { rating: 5, count: 200 },
    { rating: 4, count: 0 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
];

const variedPercentageDistributions = [
    { rating: 5, count: 200 }, // 100%
    { rating: 4, count: 100 }, // 50%
    { rating: 3, count: 50 }, // 25%
    { rating: 2, count: 10 }, // 5%
    { rating: 1, count: 2 }, // 1%
];

const skewedHighDistributions = [
    { rating: 5, count: 180 },
    { rating: 4, count: 15 },
    { rating: 3, count: 3 },
    { rating: 2, count: 1 },
    { rating: 1, count: 1 },
];

const skewedLowDistributions = [
    { rating: 5, count: 2 },
    { rating: 4, count: 3 },
    { rating: 3, count: 10 },
    { rating: 2, count: 25 },
    { rating: 1, count: 60 },
];

const sparseDistributions = [
    { rating: 5, count: 100 },
    { rating: 1, count: 10 },
];

/**
 * Default with typical distribution
 */
export const Default: Story = {
    args: {
        distributions: typicalDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Perfect rating (100% five-star reviews)
 * Demonstrates 100% label alignment
 */
export const PerfectRating: Story = {
    args: {
        distributions: perfectRatingDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Varied percentages (100%, 50%, 25%, 5%, 1%)
 * Demonstrates fixed-width label alignment across wide range
 */
export const VariedPercentages: Story = {
    args: {
        distributions: variedPercentageDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Highly rated product (most 5-star reviews)
 */
export const HighlyRated: Story = {
    args: {
        distributions: skewedHighDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Poorly rated product (most 1-star reviews)
 */
export const PoorlyRated: Story = {
    args: {
        distributions: skewedLowDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Sparse distributions (missing ratings filled with zeros)
 */
export const SparseDistributions: Story = {
    args: {
        distributions: sparseDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Empty distributions
 */
export const EmptyDistributions: Story = {
    args: {
        distributions: [],
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Large review counts (10,000+ reviews)
 */
export const LargeReviewCounts: Story = {
    args: {
        distributions: [
            { rating: 5, count: 45678 },
            { rating: 4, count: 23456 },
            { rating: 3, count: 12345 },
            { rating: 2, count: 5678 },
            { rating: 1, count: 1234 },
        ],
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Very large review counts (100,000+ reviews)
 */
export const VeryLargeReviewCounts: Story = {
    args: {
        distributions: [
            { rating: 5, count: 456789 },
            { rating: 4, count: 234567 },
            { rating: 3, count: 123456 },
            { rating: 2, count: 56789 },
            { rating: 1, count: 12345 },
        ],
    },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

/**
 * Wider container (w-96)
 */
export const WideContainer: Story = {
    args: {
        distributions: typicalDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-96">
                <Story />
            </div>
        ),
    ],
};

/**
 * Extra wide container (w-[600px])
 */
export const ExtraWideContainer: Story = {
    args: {
        distributions: typicalDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-[600px]">
                <Story />
            </div>
        ),
    ],
};

/**
 * Full width container
 */
export const FullWidthContainer: Story = {
    args: {
        distributions: typicalDistributions,
    },
    decorators: [
        (Story) => (
            <div className="w-full max-w-4xl">
                <Story />
            </div>
        ),
    ],
};

/**
 * Comparison of different container widths
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Storybook render function type inference issue
export const WidthComparison: Story = {
    render: (_args) => (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-64 (16rem / 256px)</h3>
                <div className="w-64">
                    <StarRatingDistributions distributions={typicalDistributions} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-80 (20rem / 320px)</h3>
                <div className="w-80">
                    <StarRatingDistributions distributions={typicalDistributions} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-96 (24rem / 384px)</h3>
                <div className="w-96">
                    <StarRatingDistributions distributions={typicalDistributions} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-[600px]</h3>
                <div className="w-[600px]">
                    <StarRatingDistributions distributions={typicalDistributions} />
                </div>
            </div>
        </div>
    ),
};
