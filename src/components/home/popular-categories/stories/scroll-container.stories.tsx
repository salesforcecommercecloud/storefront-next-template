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
import { CategoryScrollContainer } from '../scroll-container';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof CategoryScrollContainer> = {
    title: 'HOME/Popular Categories/Scroll Container',
    component: CategoryScrollContainer,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Horizontal scroll container with navigation arrows for category cards. Automatically shows/hides scroll buttons based on content overflow.',
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="max-w-4xl mx-auto p-8">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CategoryScrollContainer>;

const PlaceholderCard = ({ label }: { label: string }) => (
    <div className="flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] aspect-square rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-medium">
        {label}
    </div>
);

export const Default: Story = {
    args: {
        ariaLabel: 'Categories',
    },
    render: (args) => (
        <CategoryScrollContainer {...args}>
            {Array.from({ length: 6 }, (_, i) => (
                <PlaceholderCard key={i} label={`Category ${i + 1}`} />
            ))}
        </CategoryScrollContainer>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify scroll container has list role
        const list = canvas.getByRole('list');
        await expect(list).toBeInTheDocument();

        // Verify scroll buttons are present
        const scrollLeftButton = canvas.getByLabelText('Scroll Categories left');
        await expect(scrollLeftButton).toBeInTheDocument();

        const scrollRightButton = canvas.getByLabelText('Scroll Categories right');
        await expect(scrollRightButton).toBeInTheDocument();
    },
};

export const FewItems: Story = {
    args: {
        ariaLabel: 'Categories',
    },
    render: (args) => (
        <CategoryScrollContainer {...args}>
            {Array.from({ length: 2 }, (_, i) => (
                <PlaceholderCard key={i} label={`Category ${i + 1}`} />
            ))}
        </CategoryScrollContainer>
    ),
    parameters: {
        docs: {
            description: {
                story: 'With few items that may not overflow, scroll buttons remain hidden.',
            },
        },
    },
};
