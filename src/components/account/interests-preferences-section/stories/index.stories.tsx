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
import { allModes } from '../../../../../.storybook/modes';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { InterestsPreferencesSection, InterestsPreferencesSectionSkeleton } from '../index';
import CustomerPreferencesProvider from '@/providers/customer-preferences';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('interaction');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const element = target.closest('button, a, input, select, [role="button"]');

            if (element) {
                const label =
                    element.textContent?.trim() || element.getAttribute('aria-label') || element.tagName.toLowerCase();
                logClick({ type: 'click', element: element.tagName.toLowerCase(), label });
            }
        };

        root.addEventListener('click', handleClick);

        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof InterestsPreferencesSection> = {
    title: 'ACCOUNT/Interests & Preferences',
    component: InterestsPreferencesSection,
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A combined component for managing customer interests and shopping preferences. Includes design interests, product categories, shopping preferences, room measures, and size preferences.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        customerId: {
            description: 'Customer ID for fetching/updating preferences',
            control: 'text',
        },
        onSuccess: {
            description: 'Callback when data is successfully updated',
            action: 'success',
        },
        onError: {
            description: 'Callback when an error occurs',
            action: 'error',
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <CustomerPreferencesProvider>
                    <Story />
                </CustomerPreferencesProvider>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof InterestsPreferencesSection>;

export const Default: Story = {
    args: {
        customerId: 'story-customer-123',
        onSuccess: action('success'),
        onError: action('error'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for loading to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check title is rendered
        await expect(canvas.getByText('Interests & Preferences')).toBeInTheDocument();

        // Check description is rendered
        await expect(
            canvas.getByText('Add your design interests and manage your shopping preferences')
        ).toBeInTheDocument();

        // Check Edit button exists
        await expect(canvas.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    },
};

export const EditMode: Story = {
    args: {
        customerId: 'story-customer-edit',
        onSuccess: action('success'),
        onError: action('error'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for loading to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Click Edit button
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await userEvent.click(editButton);

        // Check Save and Cancel buttons appear
        await expect(canvas.getByRole('button', { name: /save/i })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

        // Check Add more buttons appear (multiple - one for interests, one for categories)
        const addMoreButtons = canvas.getAllByText(/\+ Add more/i);
        await expect(addMoreButtons.length).toBeGreaterThanOrEqual(1);
    },
};

export const CancelEdit: Story = {
    args: {
        customerId: 'story-customer-cancel',
        onSuccess: action('success'),
        onError: action('error'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for loading to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Click Edit button
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await userEvent.click(editButton);

        // Click Cancel button
        const cancelButton = canvas.getByRole('button', { name: /cancel/i });
        await userEvent.click(cancelButton);

        // Check Edit button is back
        await expect(canvas.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    },
};

export const SelectShoppingPreference: Story = {
    args: {
        customerId: 'story-customer-shopping',
        onSuccess: action('success'),
        onError: action('error'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for loading to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Click Edit button
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await userEvent.click(editButton);

        // Click Women's button
        const womensButton = canvas.getByRole('button', { name: /women's/i });
        await userEvent.click(womensButton);

        // Verify Women's is now selected (has primary bg class)
        await expect(womensButton).toHaveClass('bg-primary');
    },
};

export const OpenInterestsDialog: Story = {
    args: {
        customerId: 'story-customer-dialog',
        onSuccess: action('success'),
        onError: action('error'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for loading to complete (adapter init + data fetch)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Click Edit button
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await userEvent.click(editButton);

        // Verify Edit button worked - now we should see Save button
        await expect(canvas.getByRole('button', { name: /save/i })).toBeInTheDocument();

        // Click "+ Add more" for interests to open the dialog (use testid for reliability)
        const addMoreButton = await canvas.findByTestId('interests-add-more-button', {}, { timeout: 5000 });
        await userEvent.click(addMoreButton);

        // Dialog renders in a portal (document.body) - search there
        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();
    },
};

export const Skeleton: Story = {
    render: () => <InterestsPreferencesSectionSkeleton />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Check skeleton is rendered by looking for skeleton elements
        const skeletons = canvasElement.querySelectorAll('.animate-pulse');
        await expect(skeletons.length).toBeGreaterThan(0);
    },
};
