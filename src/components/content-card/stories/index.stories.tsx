import type { Meta, StoryObj } from '@storybook/react-vite';
import ContentCard from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function ContentCardStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('content-card-click');
        const logHover = action('content-card-hover');

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

const meta: Meta<typeof ContentCard> = {
    title: 'COMMON/Content Card',
    component: ContentCard,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A flexible card component for displaying content with optional image, title, description, and call-to-action button.

### Features:
- Optional image with lazy loading
- Title and description text
- Call-to-action button with link
- Configurable background and border
- Responsive design
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ContentCardStoryHarness>
                <Story />
            </ContentCardStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ContentCard>;

export const Default: Story = {
    render: () => (
        <ContentCard
            title="Featured Product"
            description="Discover our latest collection of premium products designed for modern living."
            imageUrl="https://via.placeholder.com/400x300"
            imageAlt="Featured Product"
            buttonText="Shop Now"
            buttonLink="/category/featured"
        />
    ),
    parameters: {
        docs: {
            story: `
Standard content card with all features enabled.

### Features:
- Image with alt text
- Title and description
- Call-to-action button
- Background and border enabled
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/featured product/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for description
        const description = await canvas.findByText(/discover our latest/i, {}, { timeout: 5000 });
        await expect(description).toBeInTheDocument();

        // Check for button
        const button = await canvas.findByRole('link', { name: /shop now/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};

export const WithoutImage: Story = {
    render: () => (
        <ContentCard
            title="Text Only Card"
            description="This card doesn't have an image, just text content and a button."
            buttonText="Learn More"
            buttonLink="/about"
        />
    ),
    parameters: {
        docs: {
            story: `
Content card without an image.

### Features:
- No image
- Text content only
- Still has button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/text only card/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const Minimal: Story = {
    render: () => (
        <ContentCard title="Minimal Card" description="A simple card with just title and description, no button." />
    ),
    parameters: {
        docs: {
            story: `
Minimal content card with only title and description.

### Features:
- No image
- No button
- Just text content
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/minimal card/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const NoBackground: Story = {
    render: () => (
        <ContentCard
            title="Transparent Card"
            description="This card has no background or border for a cleaner look."
            showBackground={false}
            showBorder={false}
            buttonText="Explore"
            buttonLink="/explore"
        />
    ),
    parameters: {
        docs: {
            story: `
Content card with transparent background and no border.

### Features:
- No background
- No border
- Clean, minimal appearance
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/transparent card/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/featured product/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for description
        const description = await canvas.findByText(/discover our latest/i, {}, { timeout: 5000 });
        await expect(description).toBeInTheDocument();

        // Check for button
        const button = await canvas.findByRole('link', { name: /shop now/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/featured product/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for description
        const description = await canvas.findByText(/discover our latest/i, {}, { timeout: 5000 });
        await expect(description).toBeInTheDocument();

        // Check for button
        const button = await canvas.findByRole('link', { name: /shop now/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for title
        const title = await canvas.findByText(/featured product/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for description
        const description = await canvas.findByText(/discover our latest/i, {}, { timeout: 5000 });
        await expect(description).toBeInTheDocument();

        // Check for button
        const button = await canvas.findByRole('link', { name: /shop now/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};
