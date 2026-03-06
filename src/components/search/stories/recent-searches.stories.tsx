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
import { allModes } from '../../../../.storybook/modes';
import RecentSearches from '../recent-searches';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('recent-search-click');
        const logClear = action('clear-recent-searches-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest('button');
            if (button && root.contains(button)) {
                if (button.textContent?.toLowerCase().includes('clear')) {
                    logClear({});
                } else {
                    logClick({ text: button.textContent?.trim() });
                }
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof RecentSearches> = {
    title: 'Search/RecentSearches',
    component: RecentSearches,
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Displays a list of recent search queries with the ability to navigate to them or clear the list.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    argTypes: {
        recentSearches: {
            description: 'Array of recent search query strings',
            control: 'object',
        },
        closeAndNavigate: {
            description: 'Callback function to close the search and navigate to a URL',
            action: 'closeAndNavigate',
        },
        clearRecentSearches: {
            description: 'Callback function to clear all recent searches',
            action: 'clearRecentSearches',
        },
    },
};

export default meta;
type Story = StoryObj<typeof RecentSearches>;

export const Default: Story = {
    args: {
        recentSearches: ['shoes', 'boots', 'sneakers'],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const recentSearchesTitles = await canvas.findAllByText(/recent searches/i, {}, { timeout: 5000 });
        await expect(recentSearchesTitles.length).toBeGreaterThan(0);

        const buttons = canvas.getAllByRole('button');
        const shoesButton = buttons.find((btn) => btn.textContent?.trim() === 'shoes');
        await expect(shoesButton).toBeInTheDocument();

        if (shoesButton) {
            await userEvent.click(shoesButton);
        }
    },
};

export const Empty: Story = {
    args: {
        recentSearches: [],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Component should render but not show recent searches title when empty
        const container = canvasElement.querySelector('.p-6');
        await expect(container).toBeInTheDocument();
    },
};

export const SingleSearch: Story = {
    args: {
        recentSearches: ['laptop'],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const laptopButton = canvas.getByRole('button', { name: /laptop/i });
        await expect(laptopButton).toBeInTheDocument();

        const clearButton = canvas.getByRole('button', { name: /clear recent searches/i });
        await expect(clearButton).toBeInTheDocument();

        await userEvent.click(clearButton);
    },
};

export const ManySearches: Story = {
    args: {
        recentSearches: [
            'shoes',
            'boots',
            'sneakers',
            'sandals',
            'flip flops',
            'running shoes',
            'hiking boots',
            'dress shoes',
        ],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const buttons = canvas.getAllByRole('button');
        const shoesButton = buttons.find((btn) => btn.textContent?.trim() === 'shoes');
        await expect(shoesButton).toBeInTheDocument();

        const clearButton = buttons.find((btn) => btn.textContent?.toLowerCase().includes('clear'));
        await expect(clearButton).toBeInTheDocument();
    },
};
