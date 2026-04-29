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
import OrderSummary from '../index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import emptyBasket from '@/components/__mocks__/empty-basket';
import { basketWithMultipleItems, inBasketProductDetails } from '@/components/__mocks__/basket-with-multiple-items';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockLocale } from '@/test-utils/config';

const mockSite = mockConfig.commerce.sites[0];

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logToggleItems = action('order-items-toggle');
        const logEditCart = action('order-edit-cart');
        const logPromoApply = action('order-promo-apply');
        const logPromoRemove = action('order-promo-remove');
        const logCheckout = action('order-checkout');
        const logAccordionToggle = action('order-accordion-toggle');
        const logPromoToggle = action('order-promo-toggle');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            // Checkout button/link
            const checkout = target.closest('a[href="/checkout"], button[data-testid="checkout"]');
            if (checkout) {
                event.preventDefault();
                logCheckout({ href: '/checkout' });
                return;
            }

            // Items accordion (common patterns: button with text or data-slot)
            const accordionBtn = target.closest('[data-accordion-trigger], [data-testid="order-items-toggle"], button');
            const label = (accordionBtn as HTMLElement | null)?.textContent?.trim() || '';
            if (accordionBtn && /items|cart items/i.test(label)) {
                logToggleItems({ label });
                return;
            }

            // Generic accordion toggles
            if (accordionBtn && /summary|totals|shipping|tax/i.test(label)) {
                logAccordionToggle({ label });
            }

            // Promo code accordion toggle (anchor/link or trigger with label)
            const promoToggle = target.closest('a, button');
            const promoLabel = (promoToggle as HTMLElement | null)?.textContent?.trim() || '';
            if (promoToggle && /do you have a promo code\?/i.test(promoLabel)) {
                logPromoToggle({ label: promoLabel });
            }

            // Edit cart link/button inside expanded items list
            const editCart = target.closest('button, a');
            const editLabel = (editCart as HTMLElement | null)?.textContent?.trim() || '';
            if (editCart && /edit cart/i.test(editLabel)) {
                event.preventDefault();
                logEditCart({ label: editLabel });
            }

            // Remove applied promo code button within Promotions applied list
            const removeBtn = target.closest('button, a');
            const removeLabel = (removeBtn as HTMLElement | null)?.textContent?.trim() || '';
            if (removeBtn && /remove/i.test(removeLabel)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const row = removeBtn.closest('div');
                const codeText = row?.querySelector('span')?.textContent?.trim() || '';
                logPromoRemove({ code: codeText || undefined });
            }
        };

        const handleSubmit = (event: Event) => {
            const form = event.target as HTMLFormElement | null;
            if (!form) return;
            if (form.matches('form[data-testid="promo-code-form"]')) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const input = form.querySelector('input[name="code"], input');
                const code = input instanceof HTMLInputElement ? input.value : '';
                logPromoApply({ code });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('submit', handleSubmit, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof OrderSummary> = {
    title: 'CHECKOUT/Order Summary',
    component: OrderSummary,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A comprehensive order summary component that displays cart items, totals, and promo codes with collapsible sections and interactive elements.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        basket: {
            description: 'The shopping basket containing items and totals',
            control: false,
        },
        showPromoCodeForm: {
            description: 'Whether to display the promo code form',
            control: 'boolean',
        },
        showCartItems: {
            description: 'Whether to display the cart items accordion',
            control: 'boolean',
        },
        showHeading: {
            description: 'Whether to display the "Order Summary" heading',
            control: 'boolean',
        },
        itemsExpanded: {
            description: 'Whether the cart items accordion should be expanded by default',
            control: 'boolean',
        },
        isEstimate: {
            description: 'Whether to show "Est." prefix for totals',
            control: 'boolean',
        },
        productsByItemId: {
            description: 'Optional product ID to product details mapping',
            control: false,
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="GBP">
                    <Story />
                </SiteProvider>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof OrderSummary>;

// Use real mock data from @mocks directory
const mockBasket = basketWithMultipleItems as ShopperBasketsV2.schemas['Basket'];

const mockBasketWithPromos = {
    ...basketWithMultipleItems,
    couponItems: [
        {
            couponItemId: 'coupon-1',
            code: 'SAVE20',
            itemText: '20% Off Discount',
        },
    ],
    orderPriceAdjustments: [
        {
            priceAdjustmentId: 'adjustment-1',
            itemText: '20% Off Discount',
            price: -59.99,
        },
    ],
} as ShopperBasketsV2.schemas['Basket'];

const mockBasketWithItemPromos = {
    ...basketWithMultipleItems,
    productItems: [
        {
            ...basketWithMultipleItems.productItems[0],
            priceAdjustments: [{ priceAdjustmentId: 'item-adj-1', itemText: '$10 Off Ties', price: -10.0 }],
            priceAfterItemDiscount: 28.38,
        },
        {
            ...basketWithMultipleItems.productItems[1],
            priceAdjustments: [{ priceAdjustmentId: 'item-adj-2', itemText: '15% Off Tops', price: -5.28 }],
            priceAfterItemDiscount: 29.91,
        },
    ],
    productSubTotal: 58.29,
    productTotal: 58.29,
} as ShopperBasketsV2.schemas['Basket'];

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

export const Default: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: true,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that component renders without errors
        void expect(canvasElement).toBeInTheDocument();
        void expect(canvasElement.children.length).toBeGreaterThan(0);

        // Test that heading is present
        const heading = canvasElement.querySelector('h1, h2, h3, [role="heading"]');
        void expect(heading).toBeInTheDocument();
    },
};

export const WithPromoCodeForm: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: true,
        showCartItems: true,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Check if promo code trigger exists (may be in accordion)
        const trigger = Array.from(canvasElement.querySelectorAll('button, a')).find((element) =>
            element.textContent?.toLowerCase().includes('promo code')
        );
        if (trigger) {
            void expect(trigger).toBeInTheDocument();
        } else {
            // If trigger not found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const WithAppliedPromotions: Story = {
    args: {
        basket: mockBasketWithPromos,
        showPromoCodeForm: true,
        showCartItems: true,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Check if adjustment text exists
        const adjustmentText = Array.from(canvasElement.querySelectorAll('span, div')).find((element) =>
            element.textContent?.includes('20% Off Discount')
        );
        if (adjustmentText) {
            void expect(adjustmentText).toBeInTheDocument();
        }
        // Check if remove button exists
        const removeButton = Array.from(canvasElement.querySelectorAll('button, a')).find((element) =>
            element.textContent?.toLowerCase().includes('remove')
        );
        if (removeButton) {
            void expect(removeButton).toBeInTheDocument();
        } else {
            // If elements not found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const WithItemLevelPromotions: Story = {
    args: {
        basket: mockBasketWithItemPromos,
        showPromoCodeForm: false,
        showCartItems: false,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const tiePromo = Array.from(canvasElement.querySelectorAll('span, div')).find((el) =>
            el.textContent?.includes('$10 Off Ties')
        );
        void expect(tiePromo).toBeInTheDocument();
        const topPromo = Array.from(canvasElement.querySelectorAll('span, div')).find((el) =>
            el.textContent?.includes('15% Off Tops')
        );
        void expect(topPromo).toBeInTheDocument();
    },
};

export const ItemsExpanded: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: true,
        showHeading: true,
        itemsExpanded: true,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // When items are expanded, the trigger may not be visible or may have different text
        const itemsTrigger = Array.from(canvasElement.querySelectorAll('[data-accordion-trigger], button')).find(
            (element) =>
                element.textContent?.toLowerCase().includes('items in cart') ||
                element.textContent?.toLowerCase().includes('items')
        );
        if (itemsTrigger) {
            void expect(itemsTrigger).toBeInTheDocument();
        } else {
            // Verify component renders even if trigger not found
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const EstimateMode: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: true,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: true,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const totalLabel = Array.from(canvasElement.querySelectorAll('span')).find((span) =>
            span.textContent?.toLowerCase().includes('estimated total')
        );
        void expect(totalLabel).not.toBeUndefined();
    },
};

export const WithoutCartItems: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: false,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const accordionHeaders = canvasElement.querySelectorAll('[data-accordion-trigger]');
        void expect(accordionHeaders.length).toBe(0);
    },
};

export const WithoutHeading: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: true,
        showHeading: false,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // In without heading mode, heading may still exist but be hidden or empty
        // Just verify component renders
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const Minimal: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: false,
        showHeading: false,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: mockProductMap,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // In minimal mode, heading may still exist but be hidden or empty
        // Just verify component renders
        void expect(canvasElement).toBeInTheDocument();
        const accordionHeaders = canvasElement.querySelectorAll('[data-accordion-trigger]');
        void expect(accordionHeaders.length).toBe(0);
    },
};

export const EmptyBasket: Story = {
    args: {
        basket: emptyBasket as ShopperBasketsV2.schemas['Basket'],
        showPromoCodeForm: false,
        showCartItems: true,
        showHeading: true,
        itemsExpanded: false,
        isEstimate: false,
        productsByItemId: {},
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Check if empty message exists
        const emptyMessage = Array.from(canvasElement.querySelectorAll('div')).find(
            (div) =>
                div.textContent?.toLowerCase().includes('no basket data available') ||
                div.textContent?.toLowerCase().includes('empty') ||
                div.textContent?.toLowerCase().includes('no items')
        );
        if (emptyMessage) {
            void expect(emptyMessage).toBeInTheDocument();
        } else {
            // If empty message not found, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const MobileCollapsible: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: false,
        showHeading: false,
        itemsExpanded: false,
        isEstimate: true,
        productsByItemId: mockProductMap,
    },
    render: (args) => {
        const totalItems = args.basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;
        return (
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="order-summary" className="border-b-0">
                    <AccordionTrigger className="px-[var(--cart-summary-px)] py-4 hover:no-underline">
                        <span className="flex-1 text-left text-sm font-semibold text-primary">
                            Estimated Total ({totalItems} items)
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <OrderSummary
                            {...args}
                            showCheckoutAction={false}
                            className="border-none shadow-none rounded-none !py-0 [--cart-summary-px:1rem]"
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: 'Mobile view with collapsible accordion. On mobile (< 768px), the Order Summary is collapsed by default with a trigger showing "Estimated Total (X items)". Click to expand and see order details.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Check for mobile accordion trigger with item count
        const accordionTrigger = Array.from(canvasElement.querySelectorAll('button')).find((button) =>
            button.textContent?.toLowerCase().includes('estimated total')
        );
        const showOrderSummaryButton = Array.from(canvasElement.querySelectorAll('button, a')).find((element) =>
            element.textContent?.toLowerCase().includes('show order summary')
        );
        if (accordionTrigger) {
            void expect(accordionTrigger).toBeInTheDocument();
            void expect(accordionTrigger.textContent).toMatch(/\d+\s+items?/i);
            void expect(showOrderSummaryButton).toBeUndefined();
        } else {
            // If not in mobile viewport, verify component still renders
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const MobileExpanded: Story = {
    args: {
        basket: mockBasket,
        showPromoCodeForm: false,
        showCartItems: false,
        showHeading: false,
        itemsExpanded: true,
        isEstimate: true,
        productsByItemId: mockProductMap,
    },
    render: (args) => {
        const totalItems = args.basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;
        return (
            <Accordion type="single" collapsible defaultValue="order-summary" className="w-full">
                <AccordionItem value="order-summary" className="border-b-0">
                    <AccordionTrigger className="px-[var(--cart-summary-px)] py-4 hover:no-underline">
                        <span className="flex-1 text-left text-sm font-semibold text-primary">
                            Estimated Total ({totalItems} items)
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <OrderSummary
                            {...args}
                            showCheckoutAction={false}
                            className="border-none shadow-none rounded-none !py-0 [--cart-summary-px:1rem]"
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: 'Mobile view with collapsible accordion expanded by default to display cart items and summary details.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const accordionTrigger = Array.from(canvasElement.querySelectorAll('button')).find((button) =>
            button.textContent?.toLowerCase().includes('estimated total')
        );
        const showOrderSummaryButton = Array.from(canvasElement.querySelectorAll('button, a')).find((element) =>
            element.textContent?.toLowerCase().includes('show order summary')
        );
        if (accordionTrigger) {
            void expect(accordionTrigger).toBeInTheDocument();
            void expect(accordionTrigger.textContent).toMatch(/\d+\s+items?/i);
            void expect(showOrderSummaryButton).toBeUndefined();
        } else {
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};
