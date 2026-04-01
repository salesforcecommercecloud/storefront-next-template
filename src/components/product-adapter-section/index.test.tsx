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

import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ProductAdapterSection from '.';
import { CollapsibleLoadingContext } from '@/components/collapsible-section/collapsible-loading-context';

vi.mock('@/hooks/product-content/use-product-content', () => ({
    useProductContent: vi.fn(),
}));

import { useProductContent } from '@/hooks/product-content/use-product-content';

const mockUseProductContent = vi.mocked(useProductContent);

describe('ProductAdapterSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when the adapter is unavailable', () => {
        test('renders nothing when adapter is undefined', () => {
            mockUseProductContent.mockReturnValue({ adapter: undefined, isEnabled: false });

            const { container } = render(<ProductAdapterSection adapterMethod="getIngredientsData" />);

            expect(container).toBeEmptyDOMElement();
        });

        test('renders nothing when isEnabled is false', () => {
            mockUseProductContent.mockReturnValue({ adapter: {} as never, isEnabled: false });

            const { container } = render(<ProductAdapterSection adapterMethod="getIngredientsData" />);

            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('when the adapter method is not implemented', () => {
        test('renders the fallback message when the method is absent from the adapter', async () => {
            mockUseProductContent.mockReturnValue({ adapter: {} as never, isEnabled: true });

            render(<ProductAdapterSection adapterMethod="getIngredientsData" />);

            await waitFor(() => {
                expect(screen.getByText('Content coming soon.')).toBeInTheDocument();
            });
        });
    });

    describe('when content is available', () => {
        test('renders HtmlFragment with the fetched HTML content', async () => {
            const mockGetIngredientsData = vi.fn().mockResolvedValue({
                html: '<ul><li>Leather upper</li><li>Rubber outsole</li></ul>',
                contentType: 'bulleted-list',
            });
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            render(<ProductAdapterSection adapterMethod="getIngredientsData" productId="test-123" />);

            await waitFor(() => {
                expect(screen.getByText('Leather upper')).toBeInTheDocument();
                expect(screen.getByText('Rubber outsole')).toBeInTheDocument();
            });
        });

        test('forwards productId to the adapter method', async () => {
            const mockGetIngredientsData = vi.fn().mockResolvedValue({
                html: '<p>Content</p>',
                contentType: 'plain-text',
            });
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            render(<ProductAdapterSection adapterMethod="getIngredientsData" productId="product-42" />);

            await waitFor(() => {
                expect(mockGetIngredientsData).toHaveBeenCalledWith('product-42');
            });
        });

        test('renders plain-text content', async () => {
            const mockGetUsageInstructions = vi.fn().mockResolvedValue({
                html: '<p>Condition leather regularly.</p>',
                contentType: 'plain-text',
            });
            mockUseProductContent.mockReturnValue({
                adapter: { getUsageInstructions: mockGetUsageInstructions } as never,
                isEnabled: true,
            });

            render(<ProductAdapterSection adapterMethod="getUsageInstructions" />);

            await waitFor(() => {
                expect(screen.getByText('Condition leather regularly.')).toBeInTheDocument();
            });
        });

        test('renders table content', async () => {
            const mockGetTechSpecs = vi.fn().mockResolvedValue({
                html: '<table><tr><td>Material</td><td>Leather</td></tr></table>',
                contentType: 'table-2-column',
            });
            mockUseProductContent.mockReturnValue({
                adapter: { getTechSpecs: mockGetTechSpecs } as never,
                isEnabled: true,
            });

            render(<ProductAdapterSection adapterMethod="getTechSpecs" />);

            await waitFor(() => {
                expect(screen.getByText('Material')).toBeInTheDocument();
                expect(screen.getByText('Leather')).toBeInTheDocument();
            });
        });
    });

    describe('CollapsibleLoadingContext integration', () => {
        test('signals setLoading(true) then setLoading(false) on successful fetch', async () => {
            const mockSetLoading = vi.fn();
            const mockGetIngredientsData = vi.fn().mockResolvedValue({
                html: '<p>Content</p>',
                contentType: 'plain-text',
            });
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            render(
                <CollapsibleLoadingContext value={{ setLoading: mockSetLoading }}>
                    <ProductAdapterSection adapterMethod="getIngredientsData" />
                </CollapsibleLoadingContext>
            );

            await waitFor(() => {
                expect(mockSetLoading).toHaveBeenCalledWith(true);
                expect(mockSetLoading).toHaveBeenLastCalledWith(false);
            });
        });

        test('signals setLoading(false) when the adapter method throws', async () => {
            const mockSetLoading = vi.fn();
            const mockGetIngredientsData = vi.fn().mockRejectedValue(new Error('network error'));
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            render(
                <CollapsibleLoadingContext value={{ setLoading: mockSetLoading }}>
                    <ProductAdapterSection adapterMethod="getIngredientsData" />
                </CollapsibleLoadingContext>
            );

            await waitFor(() => {
                expect(mockSetLoading).toHaveBeenLastCalledWith(false);
            });
        });

        test('does not signal loading when the adapter is unavailable', () => {
            const mockSetLoading = vi.fn();
            mockUseProductContent.mockReturnValue({ adapter: undefined, isEnabled: false });

            render(
                <CollapsibleLoadingContext value={{ setLoading: mockSetLoading }}>
                    <ProductAdapterSection adapterMethod="getIngredientsData" />
                </CollapsibleLoadingContext>
            );

            expect(mockSetLoading).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('renders the fallback message when the adapter method throws', async () => {
            const mockGetIngredientsData = vi.fn().mockRejectedValue(new Error('network error'));
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            render(<ProductAdapterSection adapterMethod="getIngredientsData" />);

            await waitFor(() => {
                expect(screen.getByText('Content coming soon.')).toBeInTheDocument();
            });
        });

        test('renders the fallback message when the adapter method returns null', async () => {
            const mockGetIngredientsData = vi.fn().mockResolvedValue(null);
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            render(<ProductAdapterSection adapterMethod="getIngredientsData" />);

            await waitFor(() => {
                expect(screen.getByText('Content coming soon.')).toBeInTheDocument();
            });
        });

        test('renders nothing (no fallback) while the fetch is still in progress', () => {
            const mockGetIngredientsData = vi.fn().mockReturnValue(new Promise(() => {}));
            mockUseProductContent.mockReturnValue({
                adapter: { getIngredientsData: mockGetIngredientsData } as never,
                isEnabled: true,
            });

            const { container } = render(<ProductAdapterSection adapterMethod="getIngredientsData" />);

            expect(container).toBeEmptyDOMElement();
        });
    });
});
