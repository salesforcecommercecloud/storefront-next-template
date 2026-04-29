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
import { useEffect, useRef, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';

import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockLocale } from '@/test-utils/config';

const mockSite = mockConfig.commerce.sites[0];
import CategoryRefinements from '../index';
// @ts-expect-error Mock data file is JavaScript
import searchResults from '@/components/__mocks__/search-results';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logToggle = action('refinement-toggle');
        const logSelect = action('refinement-select');
        const logClear = action('refinement-clear');
        const logChipRemove = action('refinement-chip-remove');

        const getGroupLabel = (el: HTMLElement): string => {
            const region = el.closest('[aria-labelledby]');
            const id = region?.getAttribute('aria-labelledby') || '';
            if (id) {
                const header = document.getElementById(id);
                const text = header?.textContent?.trim();
                if (text) return text;
            }
            const heading = el.closest('section, div')?.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
            if (heading?.textContent) return heading.textContent.trim();
            return '';
        };

        const getValueLabel = (controlEl: HTMLElement): string => {
            if (controlEl instanceof HTMLInputElement && controlEl.id) {
                const lab = document.querySelector(`label[for="${controlEl.id}"]`);
                if (lab?.textContent) return lab.textContent.trim();
            }
            const enclosing = controlEl.closest('label');
            if (enclosing?.textContent) return enclosing.textContent.trim();
            const textNode = controlEl.closest('li, div')?.querySelector('span, p');
            if (textNode?.textContent) return textNode.textContent.trim();
            const aria = controlEl.getAttribute('aria-label');
            if (aria) return aria;
            if (controlEl instanceof HTMLInputElement && controlEl.value) return controlEl.value;
            return '';
        };

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const trigger = target.closest('[data-accordion-trigger], button, a');
            const label = trigger?.textContent?.trim() || '';
            if (trigger && /(category|colour|color|size|price|brand|material|refinements?)/i.test(label)) {
                logToggle({ label });
            }

            const checkbox = target.closest(
                'input[type="checkbox"], input[type="radio"], [role="checkbox"], [role="radio"]'
            );
            if (checkbox) {
                const group = getGroupLabel(checkbox as HTMLElement);
                const value = getValueLabel(checkbox as HTMLElement);
                logSelect({ group, value });
                return;
            }

            const colorBtn = target.closest('button');
            if (colorBtn) {
                const group = getGroupLabel(colorBtn as HTMLElement);
                if (/colour|color/i.test(group)) {
                    const valueText = (colorBtn as HTMLElement).textContent?.trim() || '';
                    if (valueText) {
                        logSelect({ group, value: valueText });
                        return;
                    }
                }
            }

            const clearBtn = target.closest('button, a');
            const clearLabel = clearBtn?.textContent?.trim() || '';
            const aria = clearBtn?.getAttribute('aria-label') || '';
            if (clearBtn && clearBtn.closest('div')?.previousElementSibling?.textContent?.includes('Active filters')) {
                const valueText = clearLabel || aria.replace(/remove\s*/i, '');
                const group = 'Active filters';
                logChipRemove({ group, value: valueText.trim() });
                return;
            }
            if (clearBtn && (/clear|reset|remove all/i.test(clearLabel) || /remove/i.test(aria))) {
                const value = aria.replace(/remove\s*/i, '') || clearLabel;
                const group = getGroupLabel(clearBtn as HTMLElement);
                logClear({ group, value: value.trim() });
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => root.removeEventListener('click', handleClick, true);
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CategoryRefinements> = {
    title: 'PRODUCTS/Category Refinements',
    component: CategoryRefinements,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A category refinements component that displays filter options for product search results. Includes accordion-style sections for different filter types like color, size, price, and other attributes.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        result: {
            description: 'Product search result containing refinements data',
            control: false,
        },
    },
    decorators: [
        (Story: ComponentType) => (
            <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="USD">
                <ActionLogger>
                    <Story />
                </ActionLogger>
            </SiteProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CategoryRefinements>;

// Use real mock data from @mocks directory
const mockSearchResult = searchResults as ShopperSearch.schemas['ProductSearchResult'];

const mockSearchResultMinimal: ShopperSearch.schemas['ProductSearchResult'] = {
    ...mockSearchResult,
    refinements: (mockSearchResult.refinements ?? [])
        .filter((refinement) => refinement.attributeId !== 'cgid')
        .slice(0, 1),
};

const mockSearchResultEmpty: ShopperSearch.schemas['ProductSearchResult'] = {
    ...mockSearchResult,
    refinements: [],
};

export const Default: Story = {
    args: {
        result: mockSearchResult,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that category refinements component renders
        void expect(canvasElement).toBeInTheDocument();
        void expect(canvasElement.children.length).toBeGreaterThan(0);

        // Test that refinement sections are present (accordion headers)
        const refinementHeaders = canvas.queryAllByRole('button');
        void expect(refinementHeaders.length).toBeGreaterThan(0);

        // Test that at least one refinement header contains expected text
        const headerTexts = refinementHeaders.map((header: HTMLElement) => header.textContent?.toLowerCase() || '');
        const hasExpectedHeader = headerTexts.some(
            (text: string) =>
                text.includes('category') ||
                text.includes('color') ||
                text.includes('size') ||
                text.includes('price') ||
                text.includes('brand') ||
                text.includes('refinement')
        );
        void expect(hasExpectedHeader).toBe(true);

        // Test basic interaction - click on first refinement header to expand
        if (refinementHeaders.length > 0) {
            await userEvent.click(refinementHeaders[0]);
        }
    },
};

export const Minimal: Story = {
    args: {
        result: mockSearchResultMinimal,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const firstLabel = mockSearchResultMinimal.refinements?.[0]?.label ?? '';
        if (firstLabel) {
            const header = canvas.getByRole('button', { name: firstLabel });
            void expect(header).toBeInTheDocument();
        }
    },
};

export const Empty: Story = {
    args: {
        result: mockSearchResultEmpty,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const noFiltersMessage = canvas.getByText(/no filter options available/i);
        void expect(noFiltersMessage).toBeInTheDocument();
    },
};
