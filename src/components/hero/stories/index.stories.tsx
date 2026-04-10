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
import Hero from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function HeroStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('hero-click');
        const logHover = action('hero-hover');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const link = target.closest('a');
            if (link) {
                event.preventDefault();
                event.stopPropagation();
                logClick({ href: link.getAttribute('href') || '', text: link.textContent?.trim() || '' });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            logHover({ element: target.textContent?.trim() || '' });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('mouseover', handleMouseOver);
        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Hero> = {
    title: 'COMMON/Hero',
    component: Hero,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
A hero section component with background image, title, subtitle, and call-to-action button.

### Features:
- Full-width hero section
- Background image
- Overlay text content
- Call-to-action button
- Responsive design
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <HeroStoryHarness>
                <Story />
            </HeroStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Hero>;

export const Default: Story = {
    render: () => (
        <Hero
            title="Welcome to Our Store"
            subtitle="Discover amazing products for your everyday needs"
            imageUrl={{ url: 'https://via.placeholder.com/1920x1080' }}
            imageAlt="Hero background"
            imageTitle="Welcome banner"
            ctaText="Shop Now"
            ctaLink="/category/all"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Standard hero section with title, subtitle, background image, and call-to-action button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/welcome to our store/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for CTA button
        const cta = await canvas.findByRole('link', { name: /shop now/i }, { timeout: 5000 });
        await expect(cta).toBeInTheDocument();
    },
};

export const WithImageTitle: Story = {
    render: () => (
        <Hero
            title="Featured Collection"
            subtitle="Hover over the image to see the tooltip"
            imageUrl={{ url: 'https://via.placeholder.com/1920x1080' }}
            imageAlt="Featured collection background"
            imageTitle="Spring 2026 Collection"
            ctaText="View Collection"
            ctaLink="/category/featured"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Hero section with an image title attribute that shows as a tooltip on hover.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const image = await canvas.findByRole('img', {}, { timeout: 5000 });
        await expect(image).toHaveAttribute('title', 'Spring 2026 Collection');
    },
};

export const WithoutSubtitle: Story = {
    render: () => (
        <Hero
            title="Simple Hero"
            imageUrl={{ url: 'https://via.placeholder.com/1920x1080' }}
            imageAlt="Hero background"
            ctaText="Explore"
            ctaLink="/explore"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Hero section without subtitle with title only and cleaner appearance.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/simple hero/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const PageDesignerStyling: Story = {
    render: () => (
        <Hero
            title="Styled headline"
            titleTypography="Heading 2"
            titleColor="#F8FAFC"
            subtitle="Subtitle with custom color and paragraph scale"
            subtitleTypography="Paragraph"
            subtitleColor="#E2E8F0"
            imageUrl={{ url: 'https://via.placeholder.com/1920x1080' }}
            imageAlt="Hero background"
            ctaText="Shop"
            ctaLink="/category/all"
            buttonStyle="Tertiary"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates Page Designer controls: title/subtitle typography and hex colors, tertiary (outline) button style.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitForStorybookReady(canvasElement);
        await expect(await canvas.findByText(/styled headline/i, {}, { timeout: 5000 })).toBeInTheDocument();
        const link = await canvas.findByRole('link', { name: /shop/i }, { timeout: 5000 });
        await expect(link).toHaveAttribute('data-variant', 'outline');
    },
};

export const RightBlockCenteredText: Story = {
    render: () => (
        <Hero
            title="Right-aligned column"
            subtitle="Text stays centered inside the content block"
            imageUrl={{ url: 'https://via.placeholder.com/1920x1080' }}
            imageAlt="Hero background"
            ctaText="Shop Now"
            ctaLink="/category/all"
            overlayPosition="Middle Right"
            overlayAlignment="center"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Content block sits in the middle row on the right; title, subtitle, and CTA remain center-aligned within that block (Page Designer overlay controls).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitForStorybookReady(canvasElement);
        await expect(await canvas.findByText(/right-aligned column/i, {}, { timeout: 5000 })).toBeInTheDocument();
    },
};
