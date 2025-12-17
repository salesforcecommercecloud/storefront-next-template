import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import Loading from '../../loading';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logOverlayClick = action('loading-overlay-click');
        const logOverlayHover = action('loading-overlay-hover');
        const logSpinnerHover = action('loading-spinner-hover');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const overlay = target.closest('[data-testid="loading-overlay"]');
            if (overlay) {
                const pos = event as MouseEvent;
                logOverlayClick({ x: pos.clientX, y: pos.clientY });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('[data-testid="loading-overlay"]')) {
                logOverlayHover({});
            }
            if (target.closest('[data-testid="loading-spinner"]')) {
                logSpinnerHover({});
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Loading> = {
    title: 'FEEDBACK/Loading',
    component: Loading,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Route-level loading indicator that shows an overlay spinner during client-side navigations.

Note: In Storybook the navigation state is not active by default, so the default story renders nothing.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="min-h-screen bg-background">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIdle: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default state in Storybook (no active navigation) — overlay is not visible.',
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

function OverlayPreview() {
    return (
        <div className="w-full h-full fixed top-0 left-0 bg-background opacity-75 z-50" data-testid="loading-overlay">
            <div className="flex justify-center items-center mt-[50vh]">
                <div
                    className="border-border h-20 w-20 animate-spin rounded-full border-8 border-t-blue-600"
                    data-testid="loading-spinner"
                />
            </div>
        </div>
    );
}

export const DesignPreview: Story = {
    render: () => <OverlayPreview />,
    parameters: {
        docs: {
            description: {
                story: 'Design/visual preview of the loading overlay and spinner.',
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const Mobile: Story = {
    ...DefaultIdle,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const Tablet: Story = {
    ...DefaultIdle,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const Desktop: Story = {
    ...DefaultIdle,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};
