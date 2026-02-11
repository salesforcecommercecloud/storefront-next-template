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
import { StarRatingDistribution } from '../star-rating-distribution';

const meta = {
    title: 'Components/Product Ratings/Star Rating Distribution',
    component: StarRatingDistribution,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        rating: {
            control: { type: 'number', min: 1, max: 5, step: 1 },
            description: 'Star rating value (1-5)',
        },
        reviewCount: {
            control: { type: 'number', min: 0 },
            description: 'Number of reviews for this rating',
        },
        totalReviews: {
            control: { type: 'number', min: 0 },
            description: 'Total number of reviews',
        },
    },
} satisfies Meta<typeof StarRatingDistribution>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default distribution
 */
export const Default: Story = {
    args: {
        rating: 5,
        reviewCount: 120,
        totalReviews: 200,
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
 * 100% - All reviews have this rating
 */
export const OneHundredPercent: Story = {
    args: {
        rating: 5,
        reviewCount: 200,
        totalReviews: 200,
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
 * High percentage (90%)
 */
export const HighPercentage: Story = {
    args: {
        rating: 5,
        reviewCount: 180,
        totalReviews: 200,
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
 * Medium percentage (50%)
 */
export const MediumPercentage: Story = {
    args: {
        rating: 4,
        reviewCount: 100,
        totalReviews: 200,
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
 * Low percentage (5%)
 */
export const LowPercentage: Story = {
    args: {
        rating: 1,
        reviewCount: 10,
        totalReviews: 200,
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
 * Very low percentage (1%)
 */
export const VeryLowPercentage: Story = {
    args: {
        rating: 1,
        reviewCount: 2,
        totalReviews: 200,
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
 * Zero reviews
 */
export const ZeroReviews: Story = {
    args: {
        rating: 3,
        reviewCount: 0,
        totalReviews: 200,
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
 * Large review count (1,234 reviews)
 */
export const LargeReviewCount: Story = {
    args: {
        rating: 5,
        reviewCount: 1234,
        totalReviews: 5000,
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
 * Very large review count (12,345 reviews)
 */
export const VeryLargeReviewCount: Story = {
    args: {
        rating: 4,
        reviewCount: 12345,
        totalReviews: 50000,
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
 * Extremely large review count (123,456 reviews)
 */
export const ExtremelyLargeReviewCount: Story = {
    args: {
        rating: 5,
        reviewCount: 123456,
        totalReviews: 500000,
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
 * Multiple distributions with varied percentages (100% to 1%)
 * Demonstrates perfect alignment with fixed-width percentage labels
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Storybook render function type inference issue
export const MultipleDistributions: Story = {
    render: (_args) => (
        <div className="w-80 space-y-2">
            <StarRatingDistribution rating={5} reviewCount={200} totalReviews={200} />
            <StarRatingDistribution rating={4} reviewCount={100} totalReviews={200} />
            <StarRatingDistribution rating={3} reviewCount={50} totalReviews={200} />
            <StarRatingDistribution rating={2} reviewCount={10} totalReviews={200} />
            <StarRatingDistribution rating={1} reviewCount={2} totalReviews={200} />
        </div>
    ),
};

/**
 * Wider container (w-96)
 */
export const WideContainer: Story = {
    args: {
        rating: 5,
        reviewCount: 120,
        totalReviews: 200,
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
        rating: 4,
        reviewCount: 80,
        totalReviews: 200,
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
        rating: 5,
        reviewCount: 180,
        totalReviews: 200,
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
                    <StarRatingDistribution rating={5} reviewCount={120} totalReviews={200} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-80 (20rem / 320px)</h3>
                <div className="w-80">
                    <StarRatingDistribution rating={5} reviewCount={120} totalReviews={200} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-96 (24rem / 384px)</h3>
                <div className="w-96">
                    <StarRatingDistribution rating={5} reviewCount={120} totalReviews={200} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600">w-[600px]</h3>
                <div className="w-[600px]">
                    <StarRatingDistribution rating={5} reviewCount={120} totalReviews={200} />
                </div>
            </div>
        </div>
    ),
};
