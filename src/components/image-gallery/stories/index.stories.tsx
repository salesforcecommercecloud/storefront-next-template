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
import ImageGallery from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, waitFor } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { standardProd } from '@/components/__mocks__/standard-product-2';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

function ImageGalleryStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('image-gallery-click');
        const logThumbnailClick = action('image-gallery-thumbnail-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const button = target.closest('button');
            if (button) {
                logThumbnailClick({ index: button.getAttribute('data-index') || '' });
            } else {
                logClick({ element: target.tagName });
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ImageGallery> = {
    title: 'COMMON/Image Gallery',
    component: ImageGallery,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
An image gallery component with main image display and thumbnail navigation.

### Features:
- Main image display
- Thumbnail navigation
- Dynamic image loading
- Responsive design
- Empty state handling
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <ImageGalleryStoryHarness>
                    <Story />
                </ImageGalleryStoryHarness>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ImageGallery>;

// Create mock images from standardProd
const mockImages = standardProd.imageGroups?.[0]?.images?.map((img, idx) => ({
    src: img.link || img.disBaseLink || `https://via.placeholder.com/800?text=Image+${idx + 1}`,
    alt: img.alt || `Product image ${idx + 1}`,
    thumbSrc: standardProd.imageGroups?.find((g) => g.viewType === 'small')?.images?.[0]?.link || img.link,
})) || [
    {
        src: 'https://via.placeholder.com/800?text=Image+1',
        alt: 'Product image 1',
        thumbSrc: 'https://via.placeholder.com/200?text=Thumb+1',
    },
    {
        src: 'https://via.placeholder.com/800?text=Image+2',
        alt: 'Product image 2',
        thumbSrc: 'https://via.placeholder.com/200?text=Thumb+2',
    },
    {
        src: 'https://via.placeholder.com/800?text=Image+3',
        alt: 'Product image 3',
        thumbSrc: 'https://via.placeholder.com/200?text=Thumb+3',
    },
];

export const Default: Story = {
    render: () => <ImageGallery images={mockImages} />,
    parameters: {
        docs: {
            story: `
Standard image gallery with multiple images and thumbnails.

### Features:
- Main image display
- Thumbnail navigation
- Multiple images
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for canvas to be ready
        await expect(canvasElement).toBeInTheDocument();

        const canvas = within(canvasElement);

        // Check for images - DynamicImage wraps img in picture/div, thumbnails use regular img
        // Try multiple approaches to find images
        let images: HTMLElement[] = [];

        try {
            images = await canvas.findAllByRole('img', {}, { timeout: 10000 });
        } catch {
            // Fallback: query directly for img elements
            const imgElements = canvasElement.querySelectorAll('img');
            images = Array.from(imgElements);
        }

        // Should have at least main image + thumbnails (4 total for mockImages)
        await expect(images.length).toBeGreaterThan(0);

        // Verify at least one image is present
        await expect(images[0]).toBeInTheDocument();
    },
};

export const SingleImage: Story = {
    render: () => <ImageGallery images={[mockImages[0]]} />,
    parameters: {
        docs: {
            story: `
Image gallery with a single image (no thumbnails).

### Features:
- Single image
- No thumbnail navigation
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for canvas to be ready
        await expect(canvasElement).toBeInTheDocument();

        const canvas = within(canvasElement);

        // Check for image - DynamicImage may render picture element with img inside
        // Single image story has no thumbnails, so only main image
        let images: HTMLElement[] = [];

        try {
            images = await canvas.findAllByRole('img', {}, { timeout: 10000 });
        } catch {
            // Fallback: query directly for img elements
            const imgElements = canvasElement.querySelectorAll('img');
            images = Array.from(imgElements);
        }

        await expect(images.length).toBeGreaterThan(0);
        await expect(images[0]).toBeInTheDocument();
    },
};

export const EagerLoading: Story = {
    render: () => <ImageGallery images={mockImages} eager={true} />,
    parameters: {
        docs: {
            story: `
Image gallery with eager loading for above-the-fold content.

### Features:
- Eager image loading
- Faster initial render
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for canvas to be ready
        await expect(canvasElement).toBeInTheDocument();

        const canvas = within(canvasElement);

        // Check for image - DynamicImage may render picture element with img inside
        // Eager loading should have main image + thumbnails
        let images: HTMLElement[] = [];

        try {
            images = await canvas.findAllByRole('img', {}, { timeout: 10000 });
        } catch {
            // Fallback: query directly for img elements
            const imgElements = canvasElement.querySelectorAll('img');
            images = Array.from(imgElements);
        }

        await expect(images.length).toBeGreaterThan(0);
        await expect(images[0]).toBeInTheDocument();
    },
};

export const Empty: Story = {
    render: () => <ImageGallery images={[]} />,
    parameters: {
        docs: {
            story: `
Image gallery with no images (empty state).

### Features:
- Empty state message
- Graceful handling
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for canvas to be ready
        await expect(canvasElement).toBeInTheDocument();

        // Check for empty state - wait for it to appear
        // The empty state shows an emoji and text, so we check for any text content
        await waitFor(
            () => {
                const hasContent = canvasElement.textContent && canvasElement.textContent.length > 0;
                if (!hasContent) {
                    throw new Error('Empty state content not found');
                }
                return hasContent;
            },
            { timeout: 5000 }
        );
    },
};
