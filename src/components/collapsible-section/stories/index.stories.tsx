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
import CollapsibleSection from '..';

const meta: Meta<typeof CollapsibleSection> = {
    title: 'Components/CollapsibleSection',
    component: CollapsibleSection,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
    },
};

export default meta;
type Story = StoryObj<typeof CollapsibleSection>;

export const Default: Story = {
    args: {
        label: 'Description:',
        children: <p>This is the collapsible body content.</p>,
        defaultOpen: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Description:')).toBeInTheDocument();
        await expect(canvas.getByText('This is the collapsible body content.')).toBeInTheDocument();
    },
};

export const OpenByDefault: Story = {
    args: {
        label: 'Details:',
        defaultOpen: true,
        children: <p>This content is visible on load.</p>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Details:')).toBeInTheDocument();
        await expect(canvas.getByText('This content is visible on load.')).toBeInTheDocument();
        const details = canvasElement.querySelector('details');
        await expect(details).toHaveAttribute('open');
    },
};

export const ToggleInteraction: Story = {
    args: {
        label: 'Click to expand:',
        defaultOpen: false,
        children: <p>Expanded body content.</p>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const summary = canvas.getByText('Click to expand:').closest('summary');
        await expect(summary).toBeInTheDocument();

        const details = canvasElement.querySelector('details');
        await expect(details).not.toHaveAttribute('open');

        await userEvent.click(summary!);
        await expect(details).toHaveAttribute('open');

        await userEvent.click(summary!);
        await expect(details).not.toHaveAttribute('open');
    },
};

export const WithCustomClass: Story = {
    args: {
        label: 'Specifications:',
        className: 'mt-6 border rounded-md px-4',
        children: <p>Custom-styled collapsible content.</p>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Specifications:')).toBeInTheDocument();
        const details = canvasElement.querySelector('details');
        await expect(details).toHaveClass('mt-6');
    },
};
