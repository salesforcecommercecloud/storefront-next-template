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
import { Title, Description, Controls } from '@storybook/addon-docs/blocks';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import AddressSuggestionDropdown, { type AddressSuggestion } from '../index';
import { CheckoutActionLogger } from '@/components/checkout/storybook/checkout-action-logger';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

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

const meta: Meta<typeof AddressSuggestionDropdown> = {
    title: 'Components/AddressSuggestionDropdown',
    component: AddressSuggestionDropdown,
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component: `
### AddressSuggestionDropdown Component

Displays Google Places API address suggestions in a dropdown anchored below an address input field. Purely presentational — it receives suggestions as props and fires callbacks on selection or close. Used by \`AddressFormFields\` for both shipping and billing address autocomplete.

**Key Features:**

- **Suggestion list** — Renders each suggestion as a clickable button with a map pin icon and the full address description. Falls back to \`structured_formatting.main_text + secondary_text\` when \`description\` is absent.
- **Loading state** — When \`isLoading\` is true, shows a spinner with "Loading suggestions..." instead of the suggestion list.
- **Visibility** — Returns \`null\` when \`isVisible\` is false or \`suggestions\` is empty, so the parent controls mount/unmount entirely via props.
- **Close behavior** — Close button in the header calls \`onClose\`. A click-outside listener (mousedown on document) also calls \`onClose\` when the dropdown is visible.
- **Google Maps attribution** — A Google Maps logo is rendered in the card footer as required by the Places API Terms of Service.
- **Positioning** — \`position\` prop controls CSS positioning (\`absolute\` by default, also \`relative\` or \`fixed\`).

**Dependencies:**

- \`@/components/ui/button\`: \`Button\` for suggestion items and close button
- \`@/components/ui/card\`: \`Card\`, \`CardContent\`, \`CardFooter\` for dropdown structure
- \`@/components/spinner\`: loading indicator
- \`@/components/typography\`: text styling
- \`lucide-react\`: \`X\` (close icon), \`MapPin\` (suggestion icon)
`,
            },
            page: () => (
                <>
                    <Title />
                    <Description />
                    <Controls />
                </>
            ),
        },
    },
    decorators: [
        (Story) => (
            <CheckoutActionLogger name="address-suggestion-dropdown">
                <Story />
            </CheckoutActionLogger>
        ),
        (Story, context) => (
            <div className="max-w-md relative min-h-[400px]">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Enter an address..."
                        defaultValue={(context.args as Record<string, unknown>).inputValue as string}
                        className="w-full px-4 py-2 border border-border rounded-none"
                        readOnly
                        aria-label="Address input"
                    />
                    <Story />
                </div>
            </div>
        ),
    ],
    argTypes: {
        suggestions: {
            description:
                'Array of address suggestions from Google Places API. Each must have at least `description` or `structured_formatting` for display text.',
            control: 'object',
            table: { type: { summary: 'AddressSuggestion[]' } },
        },
        isVisible: {
            description:
                'Controls whether the dropdown renders. When `false` or when `suggestions` is empty, the component returns `null`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        isLoading: {
            description:
                'When `true`, shows a spinner with "Loading suggestions..." instead of the suggestion list. Default: `false`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        position: {
            description: 'CSS `position` property for the dropdown card. Default: `"absolute"`.',
            control: 'select',
            options: ['absolute', 'relative', 'fixed'],
            table: { type: { summary: "'absolute' | 'relative' | 'fixed'" } },
        },
        onClose: {
            description: 'Called when the close button is clicked or when a click-outside event is detected.',
            table: { type: { summary: '() => void' } },
        },
        onSelectSuggestion: {
            description: 'Called with the selected `AddressSuggestion` object when the user clicks a suggestion.',
            table: { type: { summary: '(suggestion: AddressSuggestion) => void' } },
        },
        className: {
            description: 'Additional CSS class name applied to the dropdown `Card` element.',
            control: 'text',
            table: { type: { summary: 'string' } },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Dropdown with three address suggestions visible. Shows the "SUGGESTED" header,
 * suggestion buttons with map pin icons, close button, and Google Maps attribution.
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

        await expect(canvas.getByTestId('address-suggestion-dropdown')).toBeInTheDocument();
        await expect(canvas.getByText('123 Main Street, New York, NY 10001, USA')).toBeInTheDocument();
        await expect(canvas.getByText('456 Oak Avenue, Los Angeles, CA 90001, USA')).toBeInTheDocument();
        await expect(canvas.getByText('789 Pine Road, Chicago, IL 60601, USA')).toBeInTheDocument();
        await expect(canvas.getByText('SUGGESTED')).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: /close suggestions/i })).toBeInTheDocument();
        await expect(canvas.getByAltText('Google Maps')).toBeInTheDocument();
    },
};

/**
 * When `description` is absent, the component falls back to
 * `structured_formatting.main_text, secondary_text`.
 */
export const StructuredFormattingFallback: Story = {
    args: {
        suggestions: [
            {
                place_id: 'ChIJd8BlQ2BZwokRNTq_mLNULnw',
                structured_formatting: {
                    main_text: '123 Main Street',
                    secondary_text: 'New York, NY 10001, USA',
                },
            },
            {
                place_id: 'ChIJE9on3F3HwoAR9AhGJW_fL-I',
                structured_formatting: {
                    main_text: '456 Oak Avenue',
                    secondary_text: 'Los Angeles, CA 90001, USA',
                },
            },
        ],
        isVisible: true,
        isLoading: false,
        onClose: action('onClose'),
        onSelectSuggestion: action('onSelectSuggestion'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByTestId('address-suggestion-dropdown')).toBeInTheDocument();
        await expect(canvas.getByText('123 Main Street, New York, NY 10001, USA')).toBeInTheDocument();
        await expect(canvas.getByText('456 Oak Avenue, Los Angeles, CA 90001, USA')).toBeInTheDocument();
    },
};

/**
 * Loading state — spinner and "Loading suggestions..." text. No suggestion
 * buttons are rendered. Input shows a partial address to reflect user typing.
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

        await expect(canvas.getByText('Loading suggestions...')).toBeInTheDocument();
        await expect(canvas.queryByText('123 Main Street, New York, NY 10001, USA')).not.toBeInTheDocument();
        await expect(canvas.queryByTestId('address-suggestion-dropdown')).not.toBeInTheDocument();
    },
};
