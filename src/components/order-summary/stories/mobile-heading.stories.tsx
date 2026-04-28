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
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockLocale } from '@/test-utils/config';
import { basketWithMultipleItems, inBasketProductDetails } from '@/components/__mocks__/basket-with-multiple-items';
import OrderSummary from '../index';
import { OrderSummaryMobileAccordion } from '../mobile-heading';

const mockSite = mockConfig.commerce.sites[0];
const mockBasket = basketWithMultipleItems as ShopperBasketsV2.schemas['Basket'];
const mockProductMap: Record<string, ShopperProducts.schemas['Product']> = {};

if (inBasketProductDetails?.data && basketWithMultipleItems?.productItems) {
    basketWithMultipleItems.productItems.forEach((item: ShopperBasketsV2.schemas['ProductItem']) => {
        const productData = inBasketProductDetails.data.find(
            (product: ShopperProducts.schemas['Product']) => product.id === item.productId
        );
        if (productData && item.itemId) {
            mockProductMap[item.itemId] = productData as ShopperProducts.schemas['Product'];
        }
    });
}

const meta: Meta<typeof OrderSummaryMobileAccordion> = {
    title: 'CHECKOUT/Order Summary/Mobile Accordion',
    component: OrderSummaryMobileAccordion,
    parameters: {
        layout: 'padded',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="GBP">
                <Story />
            </SiteProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof OrderSummaryMobileAccordion>;

export const Collapsed: Story = {
    args: {
        basket: mockBasket,
        defaultExpanded: false,
    },
    render: (args) => (
        <OrderSummaryMobileAccordion {...args}>
            <OrderSummary
                basket={mockBasket}
                showCartItems={false}
                showHeading={false}
                showPromoCodeForm={true}
                isEstimate={true}
                productsByItemId={mockProductMap}
                showCheckoutAction={false}
                className="border-none shadow-none rounded-none !py-0 [--cart-summary-px:1rem]"
            />
        </OrderSummaryMobileAccordion>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const trigger = Array.from(canvasElement.querySelectorAll('button')).find((button) =>
            button.textContent?.toLowerCase().includes('estimated total')
        );
        void expect(trigger).toBeInTheDocument();
        void expect(trigger?.textContent).toMatch(/\d+\s+items?/i);
    },
};

export const Expanded: Story = {
    args: {
        basket: mockBasket,
        defaultExpanded: true,
    },
    render: (args) => (
        <OrderSummaryMobileAccordion {...args}>
            <OrderSummary
                basket={mockBasket}
                showCartItems={false}
                showHeading={false}
                showPromoCodeForm={true}
                isEstimate={true}
                productsByItemId={mockProductMap}
                showCheckoutAction={false}
                className="border-none shadow-none rounded-none !py-0 [--cart-summary-px:1rem]"
            />
        </OrderSummaryMobileAccordion>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const trigger = Array.from(canvasElement.querySelectorAll('button')).find((button) =>
            button.textContent?.toLowerCase().includes('estimated total')
        );
        void expect(trigger).toBeInTheDocument();
        void expect(trigger).toHaveAttribute('aria-expanded', 'true');
    },
};
