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
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import AddressSuggestionDropdown, { type AddressSuggestion } from '../index';
import { action } from 'storybook/actions';

const mockSuggestions: AddressSuggestion[] = [
    {
        description: '123 Main Street, New York, NY 10001, USA',
        place_id: 'ChIJd8BlQ2BZwokRNTq_mLNULnw',
        structured_formatting: {
            main_text: '123 Main Street',
            secondary_text: 'New York, NY 10001, USA',
        },
    },
    {
        description: '456 Oak Avenue, Los Angeles, CA 90001, USA',
        place_id: 'ChIJE9on3F3HwoAR9AhGJW_fL-I',
        structured_formatting: {
            main_text: '456 Oak Avenue',
            secondary_text: 'Los Angeles, CA 90001, USA',
        },
    },
    {
        description: '789 Pine Road, Chicago, IL 60601, USA',
        place_id: 'ChIJr4aB_FZDD4gRzC4kp_ECXRI',
        structured_formatting: {
            main_text: '789 Pine Road',
            secondary_text: 'Chicago, IL 60601, USA',
        },
    },
];

/**
 * The AddressSuggestionDropdown component displays Google-powered address suggestions
 * in a dropdown format. It's designed to be used with address input fields to provide
 * autocomplete functionality.
 */
const meta: Meta<typeof AddressSuggestionDropdown> = {
    title: 'Components/Address Suggestion Dropdown',
    component: AddressSuggestionDropdown,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The Address Suggestion Dropdown component displays address autocomplete suggestions from Google Places API.

**Features:**
- Displays a list of address suggestions
- Shows loading state while fetching suggestions
- Closes when clicking outside
- Keyboard accessible (Enter/Space to select)
- Google Maps attribution logo
- Configurable position (absolute, relative, fixed)

**Usage:**
This component is typically used alongside an address input field to provide autocomplete functionality.
It requires integration with Google Places API for fetching suggestions.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="p-8 max-w-md relative min-h-[400px]">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Enter an address..."
                        className="w-full px-4 py-2 border border-border rounded-md"
                        readOnly
                    />
                    <Story />
                </div>
            </div>
        ),
    ],
    argTypes: {
        suggestions: {
            description: 'Array of address suggestions to display',
            control: 'object',
        },
        isVisible: {
            description: 'Whether the dropdown should be visible',
            control: 'boolean',
        },
        isLoading: {
            description: 'Whether the dropdown is loading',
            control: 'boolean',
        },
        position: {
            description: 'CSS position property for the dropdown',
            control: 'select',
            options: ['absolute', 'relative', 'fixed'],
        },
        onClose: {
            description: 'Callback function called when close button is clicked',
            action: 'close',
        },
        onSelectSuggestion: {
            description: 'Callback function called when a suggestion is selected',
            action: 'select-suggestion',
        },
    },
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state showing address suggestions
 */
export const Default: Story = {
    args: {
        suggestions: mockSuggestions,
        isVisible: true,
        isLoading: false,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the dropdown renders
        const dropdown = canvas.getByTestId('address-suggestion-dropdown');
        await expect(dropdown).toBeInTheDocument();

        // Verify suggestions are displayed
        await expect(canvas.getByText('123 Main Street, New York, NY 10001, USA')).toBeInTheDocument();
        await expect(canvas.getByText('456 Oak Avenue, Los Angeles, CA 90001, USA')).toBeInTheDocument();
        await expect(canvas.getByText('789 Pine Road, Chicago, IL 60601, USA')).toBeInTheDocument();

        // Verify Google Maps logo is present
        const googleLogo = canvas.getByAltText('Google Maps');
        await expect(googleLogo).toBeInTheDocument();

        // Test selecting a suggestion
        const firstSuggestion = canvas.getByText('123 Main Street, New York, NY 10001, USA');
        await userEvent.click(firstSuggestion);
    },
};

/**
 * Loading state while fetching suggestions
 */
export const Loading: Story = {
    args: {
        suggestions: mockSuggestions,
        isVisible: true,
        isLoading: true,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify loading text is displayed
        await expect(canvas.getByText(/loading/i)).toBeInTheDocument();

        // Suggestions should not be visible during loading
        await expect(canvas.queryByText('123 Main Street, New York, NY 10001, USA')).not.toBeInTheDocument();
    },
};

/**
 * Hidden state - dropdown is not visible
 */
export const Hidden: Story = {
    args: {
        suggestions: mockSuggestions,
        isVisible: false,
        isLoading: false,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Dropdown should not be rendered
        await expect(canvas.queryByTestId('address-suggestion-dropdown')).not.toBeInTheDocument();
    },
};

/**
 * Close button interaction
 */
export const CloseButtonInteraction: Story = {
    args: {
        suggestions: mockSuggestions,
        isVisible: true,
        isLoading: false,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find and click the close button
        const closeButton = canvas.getByRole('button', { name: /close/i });
        await expect(closeButton).toBeInTheDocument();
        await userEvent.click(closeButton);
    },
};

/**
 * Focused interaction test - focus first suggestion and verify keyboard/click interaction
 */
export const FocusedInteraction: Story = {
    args: {
        suggestions: mockSuggestions,
        isVisible: true,
        isLoading: false,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const firstSuggestion = canvas.getByText('123 Main Street, New York, NY 10001, USA');
        await expect(firstSuggestion).toBeInTheDocument();

        const suggestionButton = firstSuggestion.closest('button');
        await expect(suggestionButton).toBeInTheDocument();
        if (suggestionButton) {
            (suggestionButton as HTMLElement).focus();
            await expect(suggestionButton).toHaveFocus();
            await userEvent.click(suggestionButton);
        }
    },
};

/**
 * Keyboard navigation
 */
export const KeyboardNavigation: Story = {
    args: {
        suggestions: mockSuggestions,
        isVisible: true,
        isLoading: false,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Focus on first suggestion button and press Enter
        const firstSuggestionButton = canvas.getByText('123 Main Street, New York, NY 10001, USA').closest('button');
        await expect(firstSuggestionButton).toBeInTheDocument();

        if (firstSuggestionButton) {
            (firstSuggestionButton as HTMLElement).focus();
            await userEvent.keyboard('{Enter}');
        }
    },
};
