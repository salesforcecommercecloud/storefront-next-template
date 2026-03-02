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
import PdButton from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function PdButtonStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('button-click');
        const logHover = action('button-hover');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const button = target.closest('button') || target.closest('a');
            if (button) {
                event.preventDefault();
                event.stopPropagation();
                logClick({
                    text: button.textContent?.trim() || '',
                    href: button.getAttribute('href') || undefined,
                });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            logHover({ element: target.textContent?.trim() || '' });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('mouseover', handleMouseOver);
        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PdButton> = {
    title: 'PAGE DESIGNER/Atomic/Button',
    component: PdButton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A configurable button component for Page Designer with extensive styling options.

### Features:
- Customizable border radius, shadow, padding, and margin
- Typography controls (font weight, letter spacing)
- Multiple hover effects
- Can be rendered as a link or button
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <PdButtonStoryHarness>
                <Story />
            </PdButtonStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PdButton>;

export const Default: Story = {
    render: () => <PdButton text="Click me" />,
    parameters: {
        docs: {
            description: {
                story: `
Default button with standard styling.

### Features:
- Default border radius (md)
- Medium font weight
- Normal letter spacing
- No shadow
- Standard padding
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitForStorybookReady(canvasElement);
        const button = await canvas.findByRole('button', { name: /click me/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};

export const AsLink: Story = {
    render: () => <PdButton text="Go to Category" link="/category/featured" />,
    parameters: {
        docs: {
            description: {
                story: `
Button rendered as a link for navigation.

### Features:
- Rendered as Link component
- Accepts URL prop
- Maintains button styling
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitForStorybookReady(canvasElement);
        const link = await canvas.findByRole('link', { name: /go to category/i }, { timeout: 5000 });
        await expect(link).toBeInTheDocument();
        await expect(link).toHaveAttribute('href', '/category/featured');
    },
};

export const RoundedFull: Story = {
    render: () => <PdButton text="Rounded Button" borderRadius="full" paddingX="8" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with fully rounded corners (pill shape).

### Features:
- Border radius: full
- Extra horizontal padding for better pill appearance
            `,
            },
        },
    },
};

export const WithShadow: Story = {
    render: () => <PdButton text="Shadow Button" boxShadow="lg" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with large shadow for elevation.

### Features:
- Large box shadow
- Creates depth and emphasis
            `,
            },
        },
    },
};

export const BoldTypography: Story = {
    render: () => <PdButton text="Bold Button" fontWeight="bold" letterSpacing="wide" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with bold font and wide letter spacing.

### Features:
- Bold font weight
- Wide letter spacing
- Emphasizes text
            `,
            },
        },
    },
};

export const CustomPadding: Story = {
    render: () => <PdButton text="Large Button" paddingX="8" paddingY="6" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with custom padding for larger appearance.

### Features:
- Extra horizontal padding (8)
- Extra vertical padding (6)
- Larger clickable area
            `,
            },
        },
    },
};

export const ScaleHoverEffect: Story = {
    render: () => <PdButton text="Hover to Scale" hoverEffect="scale" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with scale hover effect.

### Features:
- Scales up on hover (105%)
- Scales down on active (95%)
- Interactive feedback
            `,
            },
        },
    },
};

export const OpacityHoverEffect: Story = {
    render: () => <PdButton text="Hover for Opacity" hoverEffect="opacity" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with opacity hover effect.

### Features:
- Reduces opacity on hover (90%)
- Subtle interaction
            `,
            },
        },
    },
};

export const ShadowHoverEffect: Story = {
    render: () => <PdButton text="Hover for Shadow" hoverEffect="shadow" />,
    parameters: {
        docs: {
            description: {
                story: `
Button that shows shadow on hover.

### Features:
- Adds large shadow on hover
- Creates lift effect
            `,
            },
        },
    },
};

export const FullyCustomized: Story = {
    render: () => (
        <PdButton
            text="Premium Button"
            borderRadius="xl"
            boxShadow="md"
            paddingX="8"
            paddingY="4"
            margin="2"
            fontWeight="bold"
            letterSpacing="wider"
            hoverEffect="scale"
        />
    ),
    parameters: {
        docs: {
            description: {
                story: `
Button with all styling options configured.

### Features:
- Extra large border radius
- Medium shadow
- Large padding
- Margin
- Bold font with wider letter spacing
- Scale hover effect
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitForStorybookReady(canvasElement);
        const button = await canvas.findByRole('button', { name: /premium button/i }, { timeout: 5000 });
        await expect(button).toBeInTheDocument();
    },
};

export const SharpCorners: Story = {
    render: () => <PdButton text="Sharp Button" borderRadius="none" boxShadow="sm" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with no border radius for a sharp, modern look.

### Features:
- No border radius
- Small shadow for depth
            `,
            },
        },
    },
};

export const MinimalPadding: Story = {
    render: () => <PdButton text="Compact" paddingX="2" paddingY="1" />,
    parameters: {
        docs: {
            description: {
                story: `
Button with minimal padding for compact layouts.

### Features:
- Minimal horizontal padding (2)
- Minimal vertical padding (1)
- Space-efficient
            `,
            },
        },
    },
};

export const WithMargin: Story = {
    render: () => (
        <div className="flex gap-0">
            <PdButton text="Button 1" margin="2" />
            <PdButton text="Button 2" margin="2" />
            <PdButton text="Button 3" margin="2" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Buttons with margin spacing.

### Features:
- Margin around each button
- Creates spacing without wrapper gaps
            `,
            },
        },
    },
};

export const AllBorderRadiusVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <PdButton text="None" borderRadius="none" />
            <PdButton text="Small" borderRadius="sm" />
            <PdButton text="Medium" borderRadius="md" />
            <PdButton text="Large" borderRadius="lg" />
            <PdButton text="Extra Large" borderRadius="xl" />
            <PdButton text="2X Large" borderRadius="2xl" />
            <PdButton text="Full" borderRadius="full" paddingX="8" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
All available border radius options demonstrated.
            `,
            },
        },
    },
};

export const AllShadowVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <PdButton text="None" boxShadow="none" />
            <PdButton text="Small" boxShadow="sm" />
            <PdButton text="Medium" boxShadow="md" />
            <PdButton text="Large" boxShadow="lg" />
            <PdButton text="Extra Large" boxShadow="xl" />
            <PdButton text="2X Large" boxShadow="2xl" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
All available box shadow options demonstrated.
            `,
            },
        },
    },
};
