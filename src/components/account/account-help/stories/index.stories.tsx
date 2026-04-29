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
import { AccountHelp } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { ConfigProvider, createAppConfig, deepMerge } from '@salesforce/storefront-next-runtime/config';
import { mockBuildConfig } from '@/test-utils/config';

/** Account Need Help card always mounts; Ask a question only when agent config is valid and context UI is enabled (Storybook preview sets the global flag). */
const accountHelpStoryConfig = createAppConfig(
    deepMerge(mockBuildConfig, {
        app: {
            commerceAgent: {
                enabled: true,
                embeddedServiceName: 'test_agent',
                embeddedServiceEndpoint: 'https://test.my.salesforce.com/embeddedservice/6.0/test',
                scriptSourceUrl: 'https://test.my.salesforce.com/embeddedservice/6.0/esw.min.js',
                scrt2Url: 'https://test.salesforce-scrt.com',
                salesforceOrgId: '00D000000000000EAA',
                siteId: 'RefArchGlobal',
            },
        },
    })
);

function AccountHelpWrapper(): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('account-help-button-click');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const button = target.closest('button');
            if (button) {
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || '';
                logClick({ label });
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return (
        <ConfigProvider config={accountHelpStoryConfig}>
            <div ref={containerRef}>
                <div className="p-8 max-w-2xl">
                    <AccountHelp />
                </div>
            </div>
        </ConfigProvider>
    );
}

const meta: Meta<typeof AccountHelpWrapper> = {
    title: 'ACCOUNT/Account Help',
    component: AccountHelpWrapper,
    tags: ['autodocs', 'interaction'],
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'centered',
        docs: {
            description: {
                component: `
Account Help component for the account overview page.

### Features:
- Need Help card always visible
- Ask a question (opens chat) when agent config is valid and context UI is enabled; Contact Info and Browse FAQ always shown
- Sparkle icon on primary action when present
- Responsive card layout
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof AccountHelpWrapper>;

export const Default: Story = {
    parameters: {
        docs: {
            story: `
Default account help section with shopper agent enabled.

### Features:
- Title: "Need Help?"
- Description
- Ask a question button (primary, with sparkle icon)
- Contact info button (outline)
- Browse FAQ button (outline)
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for heading
        const heading = await canvas.findByText('Need Help?', {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();

        // Check for description
        const description = await canvas.findByText(
            "We're here to assist you with any questions or concerns",
            {},
            { timeout: 5000 }
        );
        await expect(description).toBeInTheDocument();

        // Check for Ask a question button
        const askButton = await canvas.findByRole('button', { name: /Ask a question/i }, { timeout: 5000 });
        await expect(askButton).toBeInTheDocument();

        // Check for Contact info button
        const contactButton = await canvas.findByRole('button', { name: /Contact info/i }, { timeout: 5000 });
        await expect(contactButton).toBeInTheDocument();

        // Check for Browse FAQ button
        const faqButton = await canvas.findByRole('button', { name: /Browse FAQ/i }, { timeout: 5000 });
        await expect(faqButton).toBeInTheDocument();

        // Check for sparkle icon
        const sparkleIcon = askButton.querySelector('svg');
        await expect(sparkleIcon).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    parameters: {
        docs: {
            story: `
Interactive account help section for testing user interactions.

### Features:
- Button click interactions
- Hover states with cursor pointer
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find and click Ask a question button
        const askButton = await canvas.findByRole('button', { name: /Ask a question/i }, { timeout: 5000 });
        await userEvent.click(askButton);
    },
};
