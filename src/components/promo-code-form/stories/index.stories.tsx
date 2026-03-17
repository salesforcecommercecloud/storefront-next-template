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
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { PromoCodeForm } from '../index';
import type { PromoCodeFormProps } from '../types';
import { getTranslation } from '@/lib/i18next';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const { t } = getTranslation();

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logToggle = action('promo-index-accordion-toggle');
        const logType = action('promo-index-input');
        const logTypeValue = action('promo-index-input-value');
        const logApply = action('promo-index-apply');

        const isInsideHarness = (element: Element) => root.contains(element);

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) {
                return ariaLabel;
            }

            if (element instanceof HTMLInputElement) {
                const placeholder = element.placeholder?.trim();
                if (placeholder) {
                    return placeholder;
                }
            }

            const text = element.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                return text;
            }

            const title = element.getAttribute('title')?.trim();
            if (title) {
                return title;
            }

            const testId = element.getAttribute('data-testid')?.trim();
            return testId ?? '';
        };

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            if (!start) {
                return null;
            }

            const selectors = [
                'button',
                'a',
                '[role="button"]',
                'input',
                'textarea',
                'select',
                '[data-testid]',
                '[tabindex]',
                'label',
            ].join(', ');

            const match = start.closest(selectors);
            if (match instanceof HTMLElement) {
                return match;
            }

            if (start instanceof HTMLElement) {
                return start;
            }

            return start.parentElement ? findInteractiveElement(start.parentElement) : null;
        };

        const isAccordionTrigger = (element: HTMLElement, label: string): boolean => {
            if (element.hasAttribute('data-state')) {
                return true;
            }

            return label.toLowerCase() === t('cart:promoCode.accordionTitle').toLowerCase();
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (interactive instanceof HTMLButtonElement && interactive.type === 'submit') {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            if (isAccordionTrigger(interactive, label)) {
                logToggle({ label });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !isInsideHarness(target)) {
                return;
            }

            const label = deriveLabel(target);
            if (!label) {
                return;
            }

            logType({ label });

            const value = target.value ?? '';
            logTypeValue({ label: value });
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation?.();

            const submitter = (event.submitter as Element | null) ?? form.querySelector('[type="submit"]');
            const interactive = submitter ? findInteractiveElement(submitter) : null;
            const label = interactive ? deriveLabel(interactive) : t('cart:promoCode.apply');

            if (label) {
                logApply({ label });
            }
        };

        const originalFetch = window.fetch;
        window.fetch = (async (...args) => {
            const [input] = args;
            let url = '';

            if (typeof input === 'string') {
                url = input;
            } else if (input instanceof URL) {
                url = input.toString();
            } else if (input instanceof Request) {
                url = input.url;
            }

            let pathname = '';
            try {
                pathname = new URL(url, window.location.origin).pathname;
            } catch {
                pathname = url;
            }

            if (pathname.startsWith('/action/promo-code-add') || pathname.startsWith('/action/promo-code-remove')) {
                return Promise.resolve(
                    new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                );
            }

            return originalFetch(...args);
        }) as typeof window.fetch;

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            window.fetch = originalFetch;
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, [t]);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PromoCodeForm> = {
    component: PromoCodeForm,
    title: 'CART/PromoCodeFormIndex',
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
### PromoCodeForm Index Component

This is the main export component for the promo code form functionality. It provides the same interface as the form component but serves as the primary entry point for the promo code form module.

**Key Features:**
- **Main Export**: Primary component export for promo code form functionality
- **Schema Export**: Exports the Zod validation schema for promo code forms
- **Type Exports**: Provides TypeScript types for form data and props
- **Backward Compatibility**: Maintains default export for legacy usage
- **Modular Structure**: Organizes related components and utilities

**Exports:**
- \`PromoCodeForm\`: Main form component
- \`PromoCodeFields\`: Form fields sub-component
- \`promoCodeFormSchema\`: Zod validation schema
- Type definitions for form data, props, and fetcher data

**Dependencies:**
- \`zod\`: Schema validation
- \`./form\`: Main form component
- \`./promo-code-field\`: Form fields component
- \`./types\`: TypeScript type definitions
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => {
            return (
                <ActionLogger>
                    <div className="max-w-md mx-auto p-6">
                        <Story />
                    </div>
                </ActionLogger>
            );
        },
    ],
    argTypes: {
        basket: {
            control: 'object',
            description: 'Optional basket object to associate the promo code with',
        },
    },
    render: (args: { basketId?: string; basket?: unknown }) => {
        // Support both basketId (legacy) and basket props
        // Convert basketId to basket object for the component
        const basket = args.basket || (args.basketId ? { basketId: args.basketId } : undefined);
        return <PromoCodeForm basket={basket as PromoCodeFormProps['basket']} />;
    },
};

export default meta;
// Extend args to support basketId for convenience in stories
type Story = StoryObj<typeof meta> & {
    args?: { basketId?: string } & PromoCodeFormProps;
};

export const Default: Story = {
    args: {
        basketId: 'test-basket-123',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        await waitForStorybookReady(canvasElement);

        // Test that accordion trigger is present
        const accordionTrigger = await canvas.findByRole('button', { name: t('cart:promoCode.accordionTitle') });
        await expect(accordionTrigger).toBeInTheDocument();

        // Test that accordion can be expanded
        await userEvent.click(accordionTrigger);

        // Test that the promo code form container is present after opening accordion
        const form = await canvas.findByTestId('promo-code-form');
        await expect(form).toBeInTheDocument();

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();
    },
};

export const WithoutBasketId: Story = {
    args: {
        basketId: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form without a basket ID, which will display an error when trying to submit.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        await waitForStorybookReady(canvasElement);

        // Test that accordion trigger is present
        const accordionTrigger = await canvas.findByRole('button', { name: t('cart:promoCode.accordionTitle') });
        await expect(accordionTrigger).toBeInTheDocument();

        // Test that accordion can be expanded
        await userEvent.click(accordionTrigger);

        // Test that the promo code form container is present after opening accordion
        const form = await canvas.findByTestId('promo-code-form');
        await expect(form).toBeInTheDocument();

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        // Test that we can type in the input
        await userEvent.type(input, 'TESTCODE');
        await expect(input).toHaveValue('TESTCODE');
    },
};

export const WithCustomBasketId: Story = {
    args: {
        basketId: 'custom-basket-789',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with a custom basket ID for testing different basket scenarios.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        await waitForStorybookReady(canvasElement);

        // Test that accordion trigger is present
        const accordionTrigger = await canvas.findByRole('button', { name: t('cart:promoCode.accordionTitle') });
        await expect(accordionTrigger).toBeInTheDocument();

        // Test that accordion can be expanded
        await userEvent.click(accordionTrigger);

        // Test that the promo code form container is present after opening accordion
        const form = await canvas.findByTestId('promo-code-form');
        await expect(form).toBeInTheDocument();

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        // Test form interaction - type and submit
        await userEvent.type(input, 'SAVE20');
        await expect(input).toHaveValue('SAVE20');
    },
};

export const MobileView: Story = {
    args: {
        basketId: 'test-basket-123',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component optimized for mobile viewport.',
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        await waitForStorybookReady(canvasElement);

        // Test that accordion trigger is present on mobile
        const accordionTrigger = await canvas.findByRole('button', { name: t('cart:promoCode.accordionTitle') });
        await expect(accordionTrigger).toBeInTheDocument();

        // Test that accordion can be expanded on mobile
        await userEvent.click(accordionTrigger);

        // Test that the promo code form container is present after opening accordion
        const form = await canvas.findByTestId('promo-code-form');
        await expect(form).toBeInTheDocument();

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present and accessible on mobile
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();
    },
};

export const TabletView: Story = {
    args: {
        basketId: 'test-basket-123',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component optimized for tablet viewport.',
            },
        },
    },
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        await waitForStorybookReady(canvasElement);

        // Test that accordion trigger is present on tablet
        const accordionTrigger = await canvas.findByRole('button', { name: t('cart:promoCode.accordionTitle') });
        await expect(accordionTrigger).toBeInTheDocument();

        // Test that accordion can be expanded on tablet
        await userEvent.click(accordionTrigger);

        // Test that the promo code form container is present after opening accordion
        const form = await canvas.findByTestId('promo-code-form');
        await expect(form).toBeInTheDocument();

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present and accessible on tablet
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();
    },
};

export const DesktopView: Story = {
    args: {
        basketId: 'test-basket-123',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component optimized for desktop viewport.',
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        await waitForStorybookReady(canvasElement);

        // Test that accordion trigger is present on desktop
        const accordionTrigger = await canvas.findByRole('button', { name: t('cart:promoCode.accordionTitle') });
        await expect(accordionTrigger).toBeInTheDocument();

        // Test that accordion can be expanded on desktop
        await userEvent.click(accordionTrigger);

        // Test that the promo code form container is present after opening accordion
        const form = await canvas.findByTestId('promo-code-form');
        await expect(form).toBeInTheDocument();

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present and accessible on desktop
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        // Test keyboard interaction - Enter key
        await userEvent.type(input, 'DESKTOP');
        await expect(input).toHaveValue('DESKTOP');
    },
};
