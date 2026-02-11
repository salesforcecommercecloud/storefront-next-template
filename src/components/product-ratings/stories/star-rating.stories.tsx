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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

import { StarRating } from '../star-rating';

const meta: Meta<typeof StarRating> = {
    title: 'UI/Star Rating',
    component: StarRating,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A customizable star rating component for displaying product ratings with various configuration options.

## Features

- **5-star display**: Shows filled, partial, and unfilled stars
- **Opacity-based partial fill**: Partial stars use opacity to represent decimal values (e.g., 0.8 opacity for 4.8 rating)
- **Configurable labels**: Show rating label in top or right position with customizable formats
- **Rating link**: Optional clickable link showing rating and review count
- **Review count label**: Optional label showing number of reviews
- **Multiple sizes**: sm, default, and lg star sizes
- **Accessibility**: Screen reader support with proper ARIA labels
- **Lightweight**: Uses inline SVG (no icon library dependencies)

## Design Approach

The component uses the theme's muted foreground color at 30% opacity for unfilled stars, providing clear visual context while adapting to light/dark modes. Filled stars use yellow (#FBBF24) with variable opacity for partial fills.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rating | number | required | The rating value (0-5) |
| reviewCount | number | required | The number of reviews |
| showRatingLabel | boolean | false | Whether to show the rating label |
| ratingLabelPosition | 'top' or 'right' | 'top' | Position of the rating label |
| ratingLabelFormat | 'full' or 'short' | 'full' | Format of the rating label |
| ratingLabelTemplate | string | undefined | Custom template for rating label |
| ratingLabelClassName | string | 'text-lg font-semibold text-black' | Custom class name for rating label |
| showRatingLink | boolean | false | Whether to show the rating link |
| ratingLinkTemplate | string | '{rating} ({count})' | Custom template for rating link |
| onRatingLinkClick | function | undefined | Callback when rating link is clicked |
| showReviewCountLabel | boolean | false | Whether to show review count label |
| reviewCountLabelTemplate | string | 'Based on {count} reviews' | Custom template for review count |
| reviewCountLabelClassName | string | 'text-xs text-gray-500 mt-2 mb-4' | Custom class name for review count label |
| starSize | 'sm', 'default', or 'lg' | 'sm' | Size of the stars |
| starContainerAriaLabelTemplate | string | '{rating} out of {total} stars, {count} reviews' | Template for star container aria-label |
| ratingLinkAriaLabelTemplate | string | 'View all reviews' | Template for rating link aria-label |
| totalStars | number | 5 | Total number of stars (for aria-label) |

## String Formatting

Templates support placeholders:
- {rating} - The rating value
- {count} - The review count
- {total} - The total number of stars (aria-label only)

Example: "Based on {count} customer reviews" → "Based on 123 customer reviews"

## Accessibility

The component includes comprehensive accessibility features:
- Star container has role="group" with descriptive aria-label
- Star container is not keyboard focusable (non-interactive, screen readers access via aria-label)
- Individual stars are aria-hidden (info provided via aria-label)
- Rating link has descriptive aria-label separate from visual text
- All labels support localization via template props

## Localization

Translation keys are available in src/locales/[locale]/translations.json:
- product.rating.starContainerAriaLabel - Star container aria-label template
- product.rating.viewAllReviews - Rating link button aria-label

Example: starContainerAriaLabelTemplate={t('product:rating.starContainerAriaLabel')}
                `,
            },
        },
    },
    argTypes: {
        rating: {
            control: { type: 'range', min: 0, max: 5, step: 0.1 },
            description: 'The rating value (0-5)',
        },
        reviewCount: {
            control: { type: 'number', min: 0 },
            description: 'The number of reviews',
        },
        showRatingLabel: {
            control: 'boolean',
            description: 'Whether to show the rating label',
        },
        ratingLabelPosition: {
            control: 'radio',
            options: ['top', 'right'],
            description: 'Position of the rating label',
        },
        ratingLabelFormat: {
            control: 'radio',
            options: ['full', 'short'],
            description: 'Format of the rating label',
        },
        showRatingLink: {
            control: 'boolean',
            description: 'Whether to show the rating link',
        },
        showReviewCountLabel: {
            control: 'boolean',
            description: 'Whether to show the review count label',
        },
        starSize: {
            control: 'radio',
            options: ['sm', 'default', 'lg'],
            description: 'Size of the stars',
        },
        ratingLabelClassName: {
            control: 'text',
            description: 'Custom class name for the rating label',
        },
        reviewCountLabelClassName: {
            control: 'text',
            description: 'Custom class name for the review count label',
        },
        starContainerAriaLabelTemplate: {
            control: 'text',
            description:
                'Template for star container aria-label. Supports {rating}, {total}, and {count} placeholders. Translation key: product.rating.starContainerAriaLabel',
        },
        ratingLinkAriaLabelTemplate: {
            control: 'text',
            description:
                'Template for rating link button aria-label (for screen readers). Translation key: product.rating.viewAllReviews',
        },
        totalStars: {
            control: { type: 'number', min: 1, max: 10 },
            description: 'Total number of stars (for aria-label localization)',
        },
        onRatingLinkClick: {
            control: false,
            description: 'Callback when rating link is clicked',
        },
    },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        rating: 4.8,
        reviewCount: 123,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default star rating shows just the stars without any labels or links.

### Features:
- **5 stars**: 4 fully filled + 1 at 80% opacity (for 4.8 rating)
- **Theme-aware unfilled stars**: Uses semantic colors that adapt to light/dark modes
- **Screen reader accessible**: Star container has aria-label describing the rating
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);

        // Test star container has accessible aria-label
        const starContainer = canvasElement.querySelector('[role="group"]');
        await expect(starContainer).toHaveAttribute('aria-label', '4.8 out of 5 stars, 123 reviews');

        // Test star container is not keyboard focusable (non-interactive)
        await expect(starContainer).not.toHaveAttribute('tabIndex');
    },
};

export const WithTopLabel: Story = {
    args: {
        rating: 4.8,
        reviewCount: 123,
        showRatingLabel: true,
        ratingLabelPosition: 'top',
        ratingLabelFormat: 'full',
    },
    parameters: {
        docs: {
            description: {
                story: `
Shows the rating label above the stars with full format ("4.8 out of 5").

### Features:
- **Top position**: Label appears above the stars
- **Full format**: Shows "X out of 5" text
- **Clean layout**: Vertical arrangement

### Use Cases:
- Product detail pages
- Review sections where rating is the primary focus
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test label is displayed
        const label = canvas.getByText('4.8 out of 5');
        await expect(label).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const WithRightLabel: Story = {
    args: {
        rating: 3.7,
        reviewCount: 89,
        showRatingLabel: true,
        ratingLabelPosition: 'right',
        ratingLabelFormat: 'short',
    },
    parameters: {
        docs: {
            description: {
                story: `
Shows the rating label to the right of the stars with short format ("3.7").

### Features:
- **Right position**: Label appears beside the stars
- **Short format**: Shows just the numeric value
- **Compact layout**: Horizontal arrangement saves space

### Use Cases:
- Product tiles in grids
- Compact layouts where space is limited
- Product listings
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test short label is displayed
        const label = canvas.getByText('3.7');
        await expect(label).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const WithRatingLink: Story = {
    args: {
        rating: 4.5,
        reviewCount: 256,
        showRatingLink: true,
        onRatingLinkClick: action('rating link clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Shows a clickable link displaying the rating and review count ("4.5 (256)").

### Features:
- **Clickable link**: Button styled with dotted underline in gray
- **Combined info**: Shows rating and count together
- **Interactive**: Click handler for navigation to reviews
- **Styling**: Uses text-gray-600 with dotted underline decoration

### Use Cases:
- Product pages with review sections
- Linking to detailed reviews
- E-commerce product cards
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test rating link is displayed with accessible name
        const link = canvas.getByRole('button', { name: 'View all reviews' });
        await expect(link).toBeInTheDocument();

        // Test visual text is shown
        const visualText = canvas.getByText('4.5 (256)');
        await expect(visualText).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const WithReviewCountLabel: Story = {
    args: {
        rating: 4.2,
        reviewCount: 87,
        showReviewCountLabel: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
Shows a label below the stars with the review count ("Based on 87 reviews").

### Features:
- **Bottom position**: Label appears below the stars
- **Context**: Provides additional information about the rating
- **Customizable**: Template can be changed

### Use Cases:
- Product pages where review count is important
- Building trust with customers
- Detailed product information sections
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test review count label is displayed
        const label = canvas.getByText('Based on 87 reviews');
        await expect(label).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const FullFeatured: Story = {
    args: {
        rating: 4.8,
        reviewCount: 342,
        showRatingLabel: true,
        ratingLabelPosition: 'top',
        ratingLabelFormat: 'full',
        showRatingLink: true,
        showReviewCountLabel: true,
        onRatingLinkClick: action('rating link clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Shows all features enabled: top label, rating link, and review count label.

### Features:
- **Top label**: "4.8 out of 5"
- **Rating link**: "4.8 (342)" next to stars
- **Review count**: "Based on 342 reviews" below
- **Complete information**: All rating details visible

### Use Cases:
- Product detail pages
- Main product showcase
- Detailed review sections
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test top label
        const topLabel = canvas.getByText('4.8 out of 5');
        await expect(topLabel).toBeInTheDocument();

        // Test rating link with accessible name
        const link = canvas.getByRole('button', { name: 'View all reviews' });
        await expect(link).toBeInTheDocument();

        // Test visual text is shown
        const visualText = canvas.getByText('4.8 (342)');
        await expect(visualText).toBeInTheDocument();

        // Test review count label
        const reviewLabel = canvas.getByText('Based on 342 reviews');
        await expect(reviewLabel).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const CustomTemplates: Story = {
    args: {
        rating: 4.3,
        reviewCount: 156,
        showRatingLabel: true,
        ratingLabelPosition: 'top',
        ratingLabelTemplate: 'Rated {rating}/5',
        showRatingLink: true,
        ratingLinkTemplate: 'See all {count} reviews',
        showReviewCountLabel: true,
        reviewCountLabelTemplate: '{count} customer reviews',
        onRatingLinkClick: action('rating link clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Demonstrates custom string templates for all labels.

### Custom Templates:
- **Rating label**: "Rated {rating}/5" → "Rated 4.3/5"
- **Rating link**: "See all {count} reviews" → "See all 156 reviews"
- **Review count**: "{count} customer reviews" → "156 customer reviews"

### Template Placeholders:
- {rating} - The numeric rating value
- {count} - The number of reviews

### Use Cases:
- Custom branding requirements
- Multi-language support
- Specific content guidelines
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test custom rating label
        const ratingLabel = canvas.getByText('Rated 4.3/5');
        await expect(ratingLabel).toBeInTheDocument();

        // Test custom rating link
        const link = canvas.getByRole('button', { name: 'See all 156 reviews' });
        await expect(link).toBeInTheDocument();

        // Test custom review count label
        const reviewLabel = canvas.getByText('156 customer reviews');
        await expect(reviewLabel).toBeInTheDocument();
    },
};

export const SmallSize: Story = {
    args: {
        rating: 4.6,
        reviewCount: 45,
        starSize: 'sm',
        showRatingLabel: true,
        ratingLabelPosition: 'right',
        ratingLabelFormat: 'short',
        showRatingLink: true,
        onRatingLinkClick: action('rating link clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Small stars suitable for compact layouts and product tiles.

### Features:
- **Compact size**: 12px (w-3 h-3) stars
- **Space efficient**: Perfect for grids and lists
- **All features work**: Labels and links still functional

### Use Cases:
- Product grid tiles
- Compact product cards
- Sidebar widgets
- Mobile layouts
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const LargeSize: Story = {
    args: {
        rating: 4.9,
        reviewCount: 523,
        starSize: 'lg',
        showRatingLabel: true,
        ratingLabelPosition: 'top',
        ratingLabelFormat: 'full',
    },
    parameters: {
        docs: {
            description: {
                story: `
Large stars for prominent display on product detail pages.

### Features:
- **Large size**: 24px (w-6 h-6) stars
- **Prominent display**: Draws attention to high ratings
- **Clear visibility**: Easy to see at a distance

### Use Cases:
- Hero sections
- Product detail pages
- Feature highlights
- Large product cards
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test label is displayed
        const label = canvas.getByText('4.9 out of 5');
        await expect(label).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);
    },
};

export const VariousRatings: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">5.0:</span>
                <StarRating rating={5.0} reviewCount={100} showRatingLabel ratingLabelPosition="right" />
            </div>
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">4.8:</span>
                <StarRating rating={4.8} reviewCount={234} showRatingLabel ratingLabelPosition="right" />
            </div>
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">4.3:</span>
                <StarRating rating={4.3} reviewCount={89} showRatingLabel ratingLabelPosition="right" />
            </div>
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">3.7:</span>
                <StarRating rating={3.7} reviewCount={45} showRatingLabel ratingLabelPosition="right" />
            </div>
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">2.5:</span>
                <StarRating rating={2.5} reviewCount={12} showRatingLabel ratingLabelPosition="right" />
            </div>
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">1.2:</span>
                <StarRating rating={1.2} reviewCount={8} showRatingLabel ratingLabelPosition="right" />
            </div>
            <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium">0.0:</span>
                <StarRating rating={0.0} reviewCount={0} showRatingLabel ratingLabelPosition="right" />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Shows various rating values to demonstrate the opacity-based partial fill effect.

### Opacity Demonstration:
- **5.0**: All stars fully opaque (100%)
- **4.8**: 5th star at 80% opacity
- **4.3**: 5th star at 30% opacity
- **3.7**: 4th star at 70% opacity
- **2.5**: 3rd star at 50% opacity
- **1.2**: 2nd star at 20% opacity
- **0.0**: All stars gray (unfilled)

The opacity directly represents the partial value, creating a smooth visual gradient from filled to unfilled stars.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test that multiple rating groups are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBeGreaterThan(5);
    },
};

export const RatingOnPDP: Story = {
    args: {
        rating: 4.8,
        reviewCount: 342,
        starSize: 'default',
        showRatingLabel: false,
        showRatingLink: true,
        showReviewCountLabel: false,
        onRatingLinkClick: action('rating link clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product Detail Page (PDP) rating configuration with clean, clickable presentation.

### Configuration:
- **Star size**: default (16px / w-4 h-4) - balanced size for PDP
- **Labels**: Hidden for clean appearance
- **Rating link**: Visible and clickable showing "4.8 (342)"
- **Review count label**: Hidden

### Features:
- **Clickable**: Link allows users to jump to reviews section
- **Compact**: No extra labels, just stars and clickable count
- **Clean design**: Focus on visual rating with interactive element

### Use Cases:
- Product detail pages
- Main product information area
- Quick rating overview with review navigation
- E-commerce product pages
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test rating link is displayed with accessible name
        const link = canvas.getByRole('button', { name: 'View all reviews' });
        await expect(link).toBeInTheDocument();

        // Test visual text is shown
        const visualText = canvas.getByText('4.8 (342)');
        await expect(visualText).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);

        // Test default star size - check if stars have the correct class
        const firstStar = stars[0];
        await expect(firstStar).toHaveClass('w-4', 'h-4');

        // Test that rating label is not shown
        const ratingLabel = canvasElement.querySelector('.text-lg');
        await expect(ratingLabel).not.toBeInTheDocument();
    },
};

export const RatingOnDistributionSheet: Story = {
    args: {
        rating: 4.8,
        reviewCount: 342,
        starSize: 'lg',
        showRatingLabel: true,
        ratingLabelPosition: 'top',
        ratingLabelFormat: 'short',
        ratingLabelClassName: 'text-5xl font-semibold text-black mb-2',
        showReviewCountLabel: true,
        reviewCountLabelClassName: 'text-xs text-gray-500 mt-2',
    },
    parameters: {
        docs: {
            description: {
                story: `
Rating display for distribution sheets with prominent large rating number.

### Configuration:
- **Star size**: lg (24px / w-6 h-6) - large, prominent stars
- **Rating label**: text-5xl font-semibold text-black mb-2 - very large, bold number
- **Label position**: Top, showing just the rating number (short format)
- **Review count label**: text-xs text-gray-500 mt-2 - subtle, no bottom margin

### Features:
- **Prominent rating**: Extra large number draws immediate attention
- **Large stars**: 24px stars for clear visibility
- **Clean layout**: Top-aligned with spacing optimized for sheets/overlays
- **No bottom margin**: Designed to fit within constrained sheet layouts

### Use Cases:
- Review distribution sheets
- Rating breakdown overlays
- Bottom sheets with rating details
- Mobile rating detail views
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test rating label is displayed with short format
        const ratingLabel = canvas.getByText('4.8');
        await expect(ratingLabel).toBeInTheDocument();

        // Test review count label is displayed
        const reviewLabel = canvas.getByText('Based on 342 reviews');
        await expect(reviewLabel).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);

        // Test large star size - check if stars have the correct class
        const firstStar = stars[0];
        await expect(firstStar).toHaveClass('w-6', 'h-6');
    },
};

export const RatingOnRatingModal: Story = {
    args: {
        rating: 4.8,
        reviewCount: 342,
        showRatingLabel: true,
        ratingLabelPosition: 'right',
        ratingLabelFormat: 'full',
        showReviewCountLabel: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
Rating display optimized for rating modals with default styling configuration.

### Default Styles:
- **Star size**: sm (12px / w-3 h-3) - default size
- **Rating label**: text-lg font-semibold text-black - prominent and bold
- **Review count label**: text-xs text-gray-500 mt-2 mb-4 - subtle with top and bottom margin

### Features:
- **Configurable styles**: Both label styles can be overridden via className props
- **Right label format**: Shows full rating text "4.8 out of 5" next to stars
- **Review count**: Displayed below with subtle styling
- **Modal-ready**: Designed for use in modal dialogs with appropriate spacing

### Use Cases:
- Rating modals
- Quick view overlays
- Product detail pop-ups
- Review submission confirmations
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test rating label is displayed with full format
        const ratingLabel = canvas.getByText('4.8 out of 5');
        await expect(ratingLabel).toBeInTheDocument();

        // Test review count label is displayed
        const reviewLabel = canvas.getByText('Based on 342 reviews');
        await expect(reviewLabel).toBeInTheDocument();

        // Test stars are rendered
        const stars = canvasElement.querySelectorAll('svg');
        await expect(stars.length).toBe(5);

        // Test default star size (sm) - check if stars have the correct class
        const firstStar = stars[0];
        await expect(firstStar).toHaveClass('w-3', 'h-3');
    },
};
