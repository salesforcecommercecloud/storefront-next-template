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
import { GenericModalContent } from '../../generic-modal-content';

const meta: Meta<typeof GenericModalContent> = {
    title: 'Components/InfoModal/Renderers/GenericModalContent',
    component: GenericModalContent,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
GenericModalContent is a simple renderer component that displays generic ReactNode content within the InfoModal.

This component is used internally by InfoModal when the modal type is 'generic' or when custom content needs to be displayed.
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof GenericModalContent>;

export const Default: Story = {
    args: {
        content: <div className="p-4">This is generic modal content</div>,
    },
};

export const WithComplexContent: Story = {
    args: {
        content: (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Custom Content</h3>
                <p className="text-sm text-muted-foreground">This is an example of complex generic content.</p>
                <ul className="list-disc list-inside space-y-2">
                    <li>Item 1</li>
                    <li>Item 2</li>
                    <li>Item 3</li>
                </ul>
            </div>
        ),
    },
};

export const WithEmptyContent: Story = {
    args: {
        content: null,
    },
};
