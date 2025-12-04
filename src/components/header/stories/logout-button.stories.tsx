import type { Meta, StoryObj } from '@storybook/react-vite';
import LogoutButton from '../logout-button';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function LogoutButtonStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logSubmit = action('logout-button-submit');
        const logClick = action('logout-button-click');

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
            event.preventDefault();
            logSubmit({});
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const button = target.closest('button[type="submit"]');
            if (button) {
                event.preventDefault();
                logClick({});
            }
        };

        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof LogoutButton> = {
    title: 'LAYOUT/Header/Logout Button',
    component: LogoutButton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Logout Button component for signing out users.

### Features:
- Form submission via React Router
- Loading state during submission
- Disabled state while submitting
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <LogoutButtonStoryHarness>
                <div className="p-8">
                    <Story />
                </div>
            </LogoutButtonStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof LogoutButton>;

export const Default: Story = {
    render: () => <LogoutButton />,
    parameters: {
        docs: {
            description: {
                story: `
Default logout button.

### Features:
- Sign Out button
- Form submission
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for logout button
        const logoutButton = await canvas.findByRole('button', { name: /sign out/i }, { timeout: 5000 });
        await expect(logoutButton).toBeInTheDocument();
        await expect(logoutButton).not.toBeDisabled();

        // Click logout button
        await userEvent.click(logoutButton);
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

        // Check for logout button
        const logoutButton = await canvas.findByRole('button', { name: /sign out/i }, { timeout: 5000 });
        await expect(logoutButton).toBeInTheDocument();
        await expect(logoutButton).not.toBeDisabled();

        // Click logout button
        await userEvent.click(logoutButton);
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

        // Check for logout button
        const logoutButton = await canvas.findByRole('button', { name: /sign out/i }, { timeout: 5000 });
        await expect(logoutButton).toBeInTheDocument();
        await expect(logoutButton).not.toBeDisabled();

        // Click logout button
        await userEvent.click(logoutButton);
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

        // Check for logout button
        const logoutButton = await canvas.findByRole('button', { name: /sign out/i }, { timeout: 5000 });
        await expect(logoutButton).toBeInTheDocument();
        await expect(logoutButton).not.toBeDisabled();

        // Click logout button
        await userEvent.click(logoutButton);
    },
};
