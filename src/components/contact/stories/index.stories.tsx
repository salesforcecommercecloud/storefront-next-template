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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { getTranslation } from '@/lib/i18next';
import Contact from '../index';

const meta: Meta<typeof Contact> = {
    title: 'CONTACT/Contact',
    component: Contact,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Contact component with support details and a static contact form layout.

### Features:
- Two-column layout with support text and form fields
- Inputs styled with design tokens
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="bg-background px-6 py-10">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Contact>;

export const Default: Story = {
    render: () => <Contact />,
    play: async ({ canvasElement }) => {
        const { t } = getTranslation();
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { name: t('aboutUs:contact.title') })).toBeInTheDocument();
        await expect(canvas.getByText(t('aboutUs:contact.phoneDisplay'))).toBeInTheDocument();
        await expect(canvas.getByPlaceholderText(t('aboutUs:contact.form.placeholders.fullName'))).toBeInTheDocument();
        await expect(canvas.getByPlaceholderText(t('aboutUs:contact.form.placeholders.email'))).toBeInTheDocument();
        await expect(canvas.getByPlaceholderText(t('aboutUs:contact.form.placeholders.topic'))).toBeInTheDocument();
        await expect(canvas.getByPlaceholderText(t('aboutUs:contact.form.placeholders.message'))).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: t('aboutUs:contact.form.submit') })).toBeInTheDocument();
    },
};
