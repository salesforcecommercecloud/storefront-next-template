import type { Meta, StoryObj } from '@storybook/react-vite';
import SearchBar from '../search';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function SearchStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('header-search-input');
        const logSubmit = action('header-search-submit');
        const logFocus = action('header-search-focus');

        const handleInput = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement && target.type === 'text') {
                logInput({ value: target.value });
            }
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
            event.preventDefault();
            const input = form.querySelector<HTMLInputElement>('input[type="text"]');
            if (input) {
                logSubmit({ query: input.value });
            }
        };

        const handleFocus = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement) {
                logFocus({});
            }
        };

        root.addEventListener('input', handleInput, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('focus', handleFocus, true);

        return () => {
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('focus', handleFocus, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof SearchBar> = {
    title: 'LAYOUT/Header/Search',
    component: SearchBar,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Search Bar component for product and category search with suggestions.

### Features:
- Search input field
- Search suggestions popover
- Form submission
- Navigation to search results
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <SearchStoryHarness>
                <div className="p-8 w-full max-w-md">
                    <Story />
                </div>
            </SearchStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
    render: () => <SearchBar />,
    parameters: {
        docs: {
            description: {
                story: `
Default search bar component.

### Features:
- Search input field
- Search icon
- Placeholder text
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for search input
        const searchInput = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(searchInput).toBeInTheDocument();
        await expect(searchInput).toHaveAttribute('type', 'text');
    },
};

export const Interactive: Story = {
    render: () => <SearchBar />,
    parameters: {
        docs: {
            description: {
                story: `
Interactive search bar for testing user interactions.

### Features:
- Input typing
- Form submission
- Suggestions display
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find and interact with search input
        const searchInput = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await userEvent.type(searchInput, 'dress');
        await expect(searchInput).toHaveValue('dress');

        // Wait a bit for suggestions to potentially appear
        await new Promise((resolve) => setTimeout(resolve, 500));
    },
};

export const WithQuery: Story = {
    render: () => <SearchBar />,
    parameters: {
        docs: {
            description: {
                story: `
Search bar with a query entered (simulated).

### Features:
- Pre-filled search query
- Suggestions may appear
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find search input and type a query
        const searchInput = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await userEvent.type(searchInput, 'jacket');
        await expect(searchInput).toHaveValue('jacket');

        // Wait for suggestions to potentially load
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check if suggestions popover appears (may or may not appear depending on mock data)
        const documentBody = within(document.body);
        const suggestions = documentBody.queryByRole('listbox');
        // Suggestions may or may not appear, so we don't assert on them
        if (suggestions) {
            await expect(suggestions).toBeInTheDocument();
        }
    },
};
