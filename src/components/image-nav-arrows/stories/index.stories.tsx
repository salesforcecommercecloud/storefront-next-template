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
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import ImageNavArrows from '../index';

function ImageNavArrowsWrapper({ imageCount = 5, size = 'sm' }: { imageCount?: number; size?: 'sm' | 'lg' }) {
    const [index, setIndex] = useState(0);
    return (
        <div className="relative w-80 h-60 bg-muted flex items-center justify-center rounded-none">
            <span className="text-muted-foreground text-sm">
                Image {index + 1} of {imageCount}
            </span>
            <ImageNavArrows imageCount={imageCount} onIndexChange={setIndex} size={size} />
        </div>
    );
}

const meta: Meta<typeof ImageNavArrows> = {
    title: 'NAVIGATION/ImageNavArrows',
    component: ImageNavArrows,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
    render: () => <ImageNavArrowsWrapper size="sm" />,
};

export const Large: Story = {
    render: () => <ImageNavArrowsWrapper size="lg" />,
};

export const Default: Story = {
    render: () => <ImageNavArrowsWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const prevButton = canvas.getByRole('button', { name: /previous/i });
        const nextButton = canvas.getByRole('button', { name: /next/i });
        await expect(prevButton).toBeInTheDocument();
        await expect(nextButton).toBeInTheDocument();

        // Starts at image 1
        await expect(canvas.getByText('Image 1 of 5')).toBeInTheDocument();

        // Click next
        await userEvent.click(nextButton);
        await expect(canvas.getByText('Image 2 of 5')).toBeInTheDocument();

        // Click prev
        await userEvent.click(prevButton);
        await expect(canvas.getByText('Image 1 of 5')).toBeInTheDocument();

        // Wrap around backward
        await userEvent.click(prevButton);
        await expect(canvas.getByText('Image 5 of 5')).toBeInTheDocument();
    },
};
