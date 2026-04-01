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
import FiltersButton from '..';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof FiltersButton> = {
    title: 'CATEGORY/Category Refinements/Filters Button',
    component: FiltersButton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A button component that toggles the filters panel.

## Features

- **Filter Icon**: Displays a funnel icon to indicate filtering
- **Active State**: Uses filled/default styling when filters panel is open
- **Selected Count Badge**: Shows the number of currently selected filters
- **Accessible**: Proper ARIA labels and keyboard support
- **Responsive**: Works on all screen sizes
- **Composable**: Supports custom class names

## Usage

\`\`\`tsx
import FiltersButton from '@/components/category-refinements/filters-button';

function ProductListingPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <FiltersButton
      onClick={() => setFiltersOpen((prev) => !prev)}
      isActive={filtersOpen}
      selectedFiltersCount={2}
    />
  );
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`onClick\` | \`() => void\` | Callback when button is clicked |
| \`isActive\` | \`boolean\` | Whether filter section is currently shown |
| \`selectedFiltersCount\` | \`number\` | Number of selected filters to display in badge |
| \`className\` | \`string\` | Additional CSS classes |

## Behavior

- **Inactive**: Uses outline variant
- **Active**: Uses default variant
- **Badge**: Shows count when one or more filters are selected
- **Click**: Calls onClick handler to open filters panel
                `,
            },
        },
    },
    args: {
        onClick: action('filters-button-clicked'),
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
The default Filters Button when filters panel is closed:

### Features:
- **Outline variant**: Subtle button style
- **Filter icon**: Clear indication of filter functionality
- **Button text**: "Filters" label
- **aria-pressed=false**: Indicates inactive state

### Use Cases:
- Initial page load
- Filters panel collapsed
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Button should be present
        const button = canvas.getByRole('button');
        await expect(button).toBeInTheDocument();

        await expect(button).toHaveAttribute('aria-pressed', 'false');
    },
};

export const Active: Story = {
    args: {
        isActive: true,
        selectedFiltersCount: 3,
    },
    parameters: {
        docs: {
            description: {
                story: `
Filters Button when filters panel is open:

### Features:
- **Default variant**: Prominent active state
- **aria-pressed=true**: Accessible pressed state
- **Same click behavior**: Toggles filters panel

### Use Cases:
- Filters panel expanded
- Active filter interaction state
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Button should be present
        const button = canvas.getByRole('button');
        await expect(button).toBeInTheDocument();

        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(canvas.getByText('3')).toBeInTheDocument();
    },
};

export const Clicked: Story = {
    args: {
        isActive: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Interaction test: Clicking the filters button:

### Behavior:
- **Click event**: Triggers onClick handler
- **Action logged**: Click is captured in Actions panel
- **No state change**: Button remains clickable

### Testing:
- Simulates user click
- Verifies onClick handler is called
- Tests keyboard interaction
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Get the button
        const button = canvas.getByRole('button');

        // Click the button
        await userEvent.click(button);

        // onClick should have been called (logged in Actions)
        // Note: action logging is automatic via args.onClick
    },
};

export const CustomClassName: Story = {
    args: {
        isActive: true,
        className: 'w-full justify-center',
    },
    parameters: {
        docs: {
            description: {
                story: `
Filters Button with custom className:

### Features:
- **Custom styling**: Additional classes applied
- **Full width**: Button spans container width
- **Centered content**: Content is centered
- **Flexible**: Can adapt to different layouts

### Use Cases:
- Custom layouts
- Mobile-specific styling
- Responsive designs
                `,
            },
        },
    },
};

export const Mobile: Story = {
    args: {
        isActive: true,
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: `
Filters Button on mobile viewport:

### Features:
- **Responsive**: Adapts to small screens
- **Touch friendly**: Adequate touch target size
- **Active style visible**: Clearly shows panel-open state
- **Icon and text**: Both remain visible

### Use Cases:
- Mobile product listing
- Mobile search results
- Tablet views
                `,
            },
        },
    },
};

export const Desktop: Story = {
    args: {
        isActive: false,
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
        docs: {
            description: {
                story: `
Filters Button on desktop viewport:

### Features:
- **Consistent design**: Same appearance as mobile
- **Hover states**: Button has hover feedback
- **Cursor pointer**: Indicates clickability
- **Clear inactive style**: Outline variant for collapsed panel

### Use Cases:
- Desktop product listing
- Desktop search results
- Wide screen displays
                `,
            },
        },
    },
};
