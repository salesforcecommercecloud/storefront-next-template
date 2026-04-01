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
import { ConfigProvider, createAppConfig } from '@salesforce/storefront-next-runtime/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/multi-site';
import { mockConfig, mockBuildConfig } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';

import SiteSwitcher from '../index';

const site = mockConfig.commerce.sites[0];
const siteWithAlias = { ...site, alias: mockConfig.siteAliasMap?.[site.id] };

const meta: Meta<typeof SiteSwitcher> = {
    title: 'LAYOUT/SiteSwitcher',
    component: SiteSwitcher,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'A dropdown that allows users to switch between configured commerce sites. Posts to `/action/set-site` to persist the selection via cookie.',
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <SiteProvider value={siteWithAlias}>
                    <CurrencyProvider value={site.defaultCurrency}>
                        <Story />
                    </CurrencyProvider>
                </SiteProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Default renders with both sites from mockConfig (RefArchGlobal + RefArch). */
export const Default: Story = {};

const singleSiteConfig = createAppConfig({
    ...mockBuildConfig,
    app: {
        ...mockBuildConfig.app,
        commerce: {
            ...mockBuildConfig.app.commerce,
            sites: [mockBuildConfig.app.commerce.sites[0]],
        },
    },
});

/** Shows the switcher when only one site is configured. */
export const SingleSite: Story = {
    decorators: [
        (Story) => (
            <ConfigProvider config={singleSiteConfig}>
                <SiteProvider value={siteWithAlias}>
                    <CurrencyProvider value={site.defaultCurrency}>
                        <Story />
                    </CurrencyProvider>
                </SiteProvider>
            </ConfigProvider>
        ),
    ],
};
