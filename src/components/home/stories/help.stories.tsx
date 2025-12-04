import type { Meta, StoryObj } from '@storybook/react-vite';
import Help from '../help';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function HelpStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('help-navigate');
        const logClick = action('help-button-click');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const link = target.closest('a[href]');
            if (link) {
                const href = link.getAttribute('href') || '';
                const text = link.textContent?.trim() || '';
                event.preventDefault();
                logNavigate({ href, text });
                logClick({ href, text });
                return;
            }

            const button = target.closest('button');
            if (button) {
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || '';
                logClick({ label });
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Help> = {
    title: 'HOME/Help',
    component: Help,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Help component that displays a help section with a contact button.

### Features:
- Heading and description
- Contact Us button/link
- Responsive layout
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <HelpStoryHarness>
                <div className="py-16 bg-background">
                    <Story />
                </div>
            </HelpStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Help>;

export const Default: Story = {
    render: () => <Help />,
    parameters: {
        docs: {
            description: {
                story: 'Standard help component with a contact button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for heading
        const heading = await canvas.findByText(/we're here to help/i, {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();

        // Check for contact button
        const contactButton = await canvas.findByRole('link', { name: /contact us/i }, { timeout: 5000 });
        await expect(contactButton).toBeInTheDocument();
        await expect(contactButton).toHaveAttribute('href', '/contact');
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for heading
        const heading = await canvas.findByText(/we're here to help/i, {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();

        // Check for contact button
        const contactButton = await canvas.findByRole('link', { name: /contact us/i }, { timeout: 5000 });
        await expect(contactButton).toBeInTheDocument();
        await expect(contactButton).toHaveAttribute('href', '/contact');
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for heading
        const heading = await canvas.findByText(/we're here to help/i, {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();

        // Check for contact button
        const contactButton = await canvas.findByRole('link', { name: /contact us/i }, { timeout: 5000 });
        await expect(contactButton).toBeInTheDocument();
        await expect(contactButton).toHaveAttribute('href', '/contact');
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for heading
        const heading = await canvas.findByText(/we're here to help/i, {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();

        // Check for contact button
        const contactButton = await canvas.findByRole('link', { name: /contact us/i }, { timeout: 5000 });
        await expect(contactButton).toBeInTheDocument();
        await expect(contactButton).toHaveAttribute('href', '/contact');
    },
};
