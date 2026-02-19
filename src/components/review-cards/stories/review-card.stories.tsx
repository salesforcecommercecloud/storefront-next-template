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
import { ReviewCard } from '../review-card';
import type { ReviewItem } from '@/lib/adapters/product-content-data-types';

const sampleReview: ReviewItem = {
    id: 'story-1',
    authorName: 'Alexandra P.',
    verifiedPurchase: true,
    date: 'February 2025',
    location: 'Boston, MA',
    rating: 5,
    headline: 'A comprehensive review after 6 months of ownership',
    body: "I've been meaning to write this review for a while now. The matte white finish is absolutely pristine. Worth every penny.",
    helpfulCount: 12,
    reportLabel: 'Report',
};

const meta: Meta<typeof ReviewCard> = {
    title: 'Components/ReviewCards/ReviewCard',
    component: ReviewCard,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        review: {
            description: 'Review data',
        },
    },
};

export default meta;
type Story = StoryObj<typeof ReviewCard>;

export const Default: Story = {
    args: {
        review: sampleReview,
    },
    decorators: [
        (Story) => (
            <div className="w-full max-w-2xl">
                <Story />
            </div>
        ),
    ],
};

export const WithoutVerifiedBadge: Story = {
    args: {
        review: {
            ...sampleReview,
            id: 'story-2',
            verifiedPurchase: false,
        },
    },
    decorators: [
        (Story) => (
            <div className="w-full max-w-2xl">
                <Story />
            </div>
        ),
    ],
};

export const LongBodyWithReadMore: Story = {
    args: {
        review: {
            ...sampleReview,
            id: 'story-3',
            body: 'A'.repeat(500),
        },
    },
    decorators: [
        (Story) => (
            <div className="w-full max-w-2xl">
                <Story />
            </div>
        ),
    ],
};
