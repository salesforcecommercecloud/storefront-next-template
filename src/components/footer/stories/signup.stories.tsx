import type { Meta, StoryObj } from '@storybook/react-vite';
import Signup from '../signup';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';

function SignupStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('footer-signup-input');
        const logSubmit = action('footer-signup-submit');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement) {
                logInput({ field: target.name || target.id, value: target.value });
            }
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
            event.preventDefault();
            const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
            if (emailInput) {
                logSubmit({ email: emailInput.value });
            }
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Signup> = {
    title: 'LAYOUT/Footer/Signup',
    component: Signup,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Footer signup component for newsletter subscription.

### Features:
- Email input field
- Subscribe button
- Form submission handling
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <SignupStoryHarness>
                <div className="p-8 max-w-md">
                    <Story />
                </div>
            </SignupStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Signup>;

export const Default: Story = {
    render: () => <Signup />,
    parameters: {
        docs: {
            story: `
Default footer signup component.

### Features:
- Email input field
- Subscribe button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Check for heading
        const heading = canvas.getByText(/be the first to know/i);
        await expect(heading).toBeInTheDocument();

        // Check for email input
        const emailInput = await canvas.findByPlaceholderText(/your email/i, {}, { timeout: 500 });
        await expect(emailInput).toBeInTheDocument();
        await userEvent.type(emailInput, 'user@example.com');
        await expect(emailInput).toHaveValue('user@example.com');

        // Check for subscribe button
        const subscribeButton = await canvas.findByRole('button', { name: /subscribe/i }, { timeout: 500 });
        await expect(subscribeButton).toBeInTheDocument();
        await userEvent.click(subscribeButton);
    },
};
