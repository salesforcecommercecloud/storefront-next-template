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
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { ProductTileProvider, useProductTileContext } from '../context';

/**
 * Simple consumer component that renders context values for snapshot testing.
 */
function ContextConsumer() {
    const { config, t, currency, swatchMode, getBadges } = useProductTileContext();

    const { hasBadges, badges } = getBadges({
        productId: 'test-product',
        representedProduct: { c_isSale: true },
    } as never);

    return (
        <dl data-testid="context-consumer">
            <dt>currency</dt>
            <dd data-testid="currency">{currency ?? 'undefined'}</dd>

            <dt>swatchMode</dt>
            <dd data-testid="swatch-mode">{swatchMode}</dd>

            <dt>translation</dt>
            <dd data-testid="translation">{t('moreOptions')}</dd>

            <dt>config.defaultSiteId</dt>
            <dd data-testid="default-site-id">{config.defaultSiteId}</dd>

            <dt>hasBadges</dt>
            <dd data-testid="has-badges">{String(hasBadges)}</dd>

            <dt>badges</dt>
            <dd data-testid="badges">{badges.map((b) => b.label).join(', ')}</dd>
        </dl>
    );
}

const meta: Meta = {
    title: 'Components/ProductTile/Context',
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <ProductTileProvider>
                    <Story />
                </ProductTileProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
    render: () => <ContextConsumer />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByTestId('currency')).toBeInTheDocument();
        await expect(canvas.getByTestId('swatch-mode')).toBeInTheDocument();
        await expect(canvas.getByTestId('translation')).toBeInTheDocument();
        await expect(canvas.getByTestId('default-site-id')).toBeInTheDocument();
        await expect(canvas.getByTestId('has-badges')).toHaveTextContent('true');
        await expect(canvas.getByTestId('badges')).toHaveTextContent('Sale');
    },
};
