import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import SearchSuggestionsSection from './suggestions';

// Mock child components
vi.mock('./suggestions-list', () => ({
    default: ({ suggestions, closeAndNavigate }: any) => (
        <div data-testid="suggestions-list">
            {suggestions?.map((suggestion: any) => (
                <button
                    key={suggestion.link || suggestion.name}
                    onClick={() => closeAndNavigate?.(suggestion.link)}
                    data-testid="suggestion-item">
                    {suggestion.name}
                </button>
            ))}
        </div>
    ),
}));

vi.mock('./suggestions-grid', () => ({
    default: ({ suggestions, closeAndNavigate }: any) => (
        <div data-testid="suggestions-grid">
            {suggestions?.map((suggestion: any) => (
                <button
                    key={suggestion.link || suggestion.name}
                    onClick={() => closeAndNavigate?.(suggestion.link)}
                    data-testid="grid-item">
                    {suggestion.name}
                </button>
            ))}
        </div>
    ),
}));

// Mock URL builder
vi.mock('@/lib/url', () => ({
    searchUrlBuilder: vi.fn((phrase: string) => `/search?q=${encodeURIComponent(phrase)}`),
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SearchSuggestionsSection Component', () => {
    const mockCloseAndNavigate = vi.fn();

    beforeEach(() => {
        mockCloseAndNavigate.mockClear();
    });

    const mockSearchSuggestions = {
        searchPhrase: 'test search',
        categorySuggestions: [
            {
                name: 'Electronics',
                link: '/category/electronics',
            },
            {
                name: 'Phones',
                link: '/category/phones',
            },
        ],
        productSuggestions: [
            {
                name: 'iPhone 15',
                link: '/product/iphone-15',
                image: 'https://example.com/iphone.jpg',
                price: 999,
            },
            {
                name: 'Samsung Galaxy',
                link: '/product/samsung-galaxy',
                price: 799,
            },
        ],
        phraseSuggestions: [
            {
                name: 'test search corrected',
                link: '/search?q=test%20search%20corrected',
                exactMatch: false,
            },
        ],
    };

    describe('Basic Rendering', () => {
        it('should render without crashing with empty suggestions', () => {
            const emptySuggestions = {};

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={emptySuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.queryByText(/Categories|Products/i)).not.toBeInTheDocument();
        });

        it('should render with complete search suggestions', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Should render both mobile and desktop layouts
            expect(screen.getAllByTestId('suggestions-list')).toHaveLength(3); // 1 mobile categories + 1 mobile products + 1 desktop categories
            expect(screen.getByTestId('suggestions-grid')).toBeInTheDocument();
        });

        it('should render container with correct classes', () => {
            const { container } = renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const mainContainer = container.firstChild as HTMLElement;
            expect(mainContainer).toHaveClass('p-6', 'space-y-0');
        });
    });

    describe('Mobile Layout', () => {
        it('should render mobile layout with correct structure', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const mobileContainer = screen.getAllByText('Categories')[0].closest('.block.md\\:hidden');
            expect(mobileContainer).toBeInTheDocument();
        });

        it('should show "Did you mean" suggestion for mobile when exactMatch is false', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const didYouMeanTexts = screen.getAllByText(/Did you mean/);
            expect(didYouMeanTexts).toHaveLength(2); // One for mobile, one for desktop

            const correctedLinks = screen.getAllByText('test search corrected?');
            expect(correctedLinks).toHaveLength(2); // One for mobile, one for desktop
        });

        it('should render categories section in mobile layout', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const categoriesHeaders = screen.getAllByText('Categories');
            expect(categoriesHeaders).toHaveLength(2); // One for mobile, one for desktop
        });

        it('should render products section in mobile layout', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const productsHeaders = screen.getAllByText('Products');
            expect(productsHeaders).toHaveLength(1); // Only in mobile layout
        });
    });

    describe('Desktop Layout', () => {
        it('should render desktop layout with correct structure', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const desktopContainer = screen.getByText('View All').closest('.hidden.md\\:flex');
            expect(desktopContainer).toBeInTheDocument();
        });

        it('should render View All link in desktop layout', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');
            // React Router Link component shows href as "/" in testing environment
            expect(viewAllLink).toBeInTheDocument();
        });

        it('should use proper React Router Link props (to instead of href)', () => {
            // Test that the fix for href -> to conversion is working
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={{
                        ...mockSearchSuggestions,
                        phraseSuggestions: [
                            {
                                name: 'corrected search',
                                link: '/search?q=corrected',
                                exactMatch: false,
                            },
                        ],
                    }}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');
            const didYouMeanLinks = screen.getAllByText('corrected search?');

            // Both should be rendered as proper anchor elements (React Router Link)
            expect(viewAllLink.tagName).toBe('A');
            expect(didYouMeanLinks.length).toBe(2); // Mobile and desktop versions
            didYouMeanLinks.forEach((link) => {
                expect(link.tagName).toBe('A');
            });

            // Should be clickable (React Router handles navigation)
            expect(viewAllLink).toBeInTheDocument();
            didYouMeanLinks.forEach((link) => {
                expect(link).toBeInTheDocument();
            });
        });

        it('should render suggestions grid in desktop layout', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.getByTestId('suggestions-grid')).toBeInTheDocument();
        });
    });

    describe('Conditional Rendering', () => {
        it('should not render categories section when no categories', () => {
            const suggestionsWithoutCategories = {
                ...mockSearchSuggestions,
                categorySuggestions: [],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithoutCategories}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.queryByText('Categories')).not.toBeInTheDocument();
        });

        it('should not render "0" when categories array is empty (Boolean conversion fix)', () => {
            const suggestionsWithEmptyArrays = {
                categorySuggestions: [], // Empty array - length is 0
                productSuggestions: [{ name: 'Test Product', link: '/product/test', price: 10 }],
                phraseSuggestions: [],
                searchPhrase: 'test',
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithEmptyArrays}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Should not render the number "0" anywhere in the component
            expect(screen.queryByText('0')).not.toBeInTheDocument();
            // Should still render products (appears in both mobile and desktop)
            expect(screen.getAllByText('Test Product').length).toBeGreaterThan(0);
        });

        it('should not render products section when no products', () => {
            const suggestionsWithoutProducts = {
                ...mockSearchSuggestions,
                productSuggestions: [],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithoutProducts}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.queryByText('Products')).not.toBeInTheDocument();
            expect(screen.queryByTestId('suggestions-grid')).not.toBeInTheDocument();
            expect(screen.queryByText('View All')).not.toBeInTheDocument();
        });

        it('should not render "Did you mean" when exactMatch is true', () => {
            const suggestionsWithExactMatch = {
                ...mockSearchSuggestions,
                phraseSuggestions: [
                    {
                        name: 'exact search',
                        link: '/search?q=exact%20search',
                        exactMatch: true,
                    },
                ],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithExactMatch}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
        });

        it('should not render "Did you mean" when no phrase suggestions', () => {
            const suggestionsWithoutPhrases = {
                ...mockSearchSuggestions,
                phraseSuggestions: [],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithoutPhrases}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
        });
    });

    describe('Click Interactions', () => {
        it('should call closeAndNavigate when "Did you mean" link is clicked', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const correctedLinks = screen.getAllByText('test search corrected?');
            fireEvent.click(correctedLinks[0]); // Click the first one (mobile)

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=test%20search%20corrected');
        });

        it('should call closeAndNavigate when View All link is clicked', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');
            fireEvent.click(viewAllLink);

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=test%20search');
        });

        it('should propagate closeAndNavigate to child components', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Click on a category suggestion (through mocked component)
            const suggestionItems = screen.getAllByTestId('suggestion-item');
            fireEvent.click(suggestionItems[0]);

            expect(mockCloseAndNavigate).toHaveBeenCalled();
        });

        it('should propagate closeAndNavigate to suggestions grid', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Click on a product suggestion (through mocked grid component)
            const gridItems = screen.getAllByTestId('grid-item');
            fireEvent.click(gridItems[0]);

            expect(mockCloseAndNavigate).toHaveBeenCalled();
        });
    });

    describe('Props and Configuration', () => {
        it('should handle missing searchPhrase gracefully', () => {
            const suggestionsWithoutPhrase = {
                ...mockSearchSuggestions,
                searchPhrase: undefined,
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithoutPhrase}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');
            // React Router Link component shows href as "/" in testing environment
            expect(viewAllLink).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle undefined suggestions arrays', () => {
            const suggestionsWithUndefined = {
                searchPhrase: 'test',
                categorySuggestions: undefined,
                productSuggestions: undefined,
                phraseSuggestions: undefined,
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithUndefined}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            expect(screen.queryByText('Categories')).not.toBeInTheDocument();
            expect(screen.queryByText('Products')).not.toBeInTheDocument();
            expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
        });

        it('should handle empty string searchPhrase', () => {
            const suggestionsWithEmptyPhrase = {
                ...mockSearchSuggestions,
                searchPhrase: '',
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithEmptyPhrase}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');
            // React Router Link component shows href as "/" in testing environment
            expect(viewAllLink).toBeInTheDocument();
        });

        it('should handle malformed phrase suggestions', () => {
            const suggestionsWithMalformedPhrase = {
                ...mockSearchSuggestions,
                phraseSuggestions: [
                    {
                        name: '',
                        link: '',
                        exactMatch: false,
                    },
                ],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithMalformedPhrase}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Should still render "Did you mean" section but with empty content
            expect(screen.getAllByText(/Did you mean/)).toHaveLength(2);
        });
    });

    describe('Responsive Layout Classes', () => {
        it('should have correct responsive classes for mobile layout', () => {
            const { container } = renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const mobileContainer = container.querySelector('.block.md\\:hidden');
            expect(mobileContainer).toBeInTheDocument();
        });

        it('should have correct responsive classes for desktop layout', () => {
            const { container } = renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const desktopContainer = container.querySelector('.hidden.md\\:flex');
            expect(desktopContainer).toBeInTheDocument();
        });

        it('should apply correct flex classes to desktop layout sections', () => {
            const { container } = renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const leftSection = container.querySelector('.flex-1');
            const middleSection = container.querySelector('.flex-\\[3\\]');
            const rightSection = container.querySelector('.flex-1.flex.items-center');

            expect(leftSection).toBeInTheDocument();
            expect(middleSection).toBeInTheDocument();
            expect(rightSection).toBeInTheDocument();
        });
    });

    describe('Arrow Function Coverage', () => {
        it('should execute the mobile "Did you mean" link click handler', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Find the mobile "Did you mean" link
            const didYouMeanLinks = screen.getAllByText(/test search corrected/);
            const mobileLink = didYouMeanLinks[0]; // First one is mobile

            fireEvent.click(mobileLink);

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=test%20search%20corrected');
        });

        it('should execute the desktop "Did you mean" link click handler', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Find the desktop "Did you mean" link
            const didYouMeanLinks = screen.getAllByText(/test search corrected/);
            const desktopLink = didYouMeanLinks[1]; // Second one is desktop

            fireEvent.click(desktopLink);

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=test%20search%20corrected');
        });

        it('should execute the "View All" link click handler', () => {
            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mockSearchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');

            fireEvent.click(viewAllLink);

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=test%20search');
        });

        it('should execute "View All" with empty searchPhrase', () => {
            const suggestionsWithEmptyPhrase = {
                ...mockSearchSuggestions,
                searchPhrase: '',
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithEmptyPhrase}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');

            fireEvent.click(viewAllLink);

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=');
        });

        it('should execute "View All" with undefined searchPhrase', () => {
            const suggestionsWithUndefinedPhrase = {
                ...mockSearchSuggestions,
                searchPhrase: undefined,
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithUndefinedPhrase}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');

            fireEvent.click(viewAllLink);

            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=');
        });

        it('should handle completely null/undefined searchSuggestions', () => {
            renderWithRouter(
                <SearchSuggestionsSection searchSuggestions={null as any} closeAndNavigate={mockCloseAndNavigate} />
            );

            // Should not crash - component should handle null gracefully
            expect(document.body).toBeInTheDocument();
        });

        it('should handle suggestions with mixed empty and populated arrays', () => {
            const mixedSuggestions = {
                categorySuggestions: [], // Empty
                productSuggestions: [{ name: 'Test Product', link: '/product/test', price: 10 }], // Has content
                phraseSuggestions: [], // Empty
                searchPhrase: 'test',
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={mixedSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Should only render products, not categories or phrases
            expect(screen.queryByText('Categories')).not.toBeInTheDocument();
            expect(screen.getAllByText('Test Product').length).toBeGreaterThan(0);
            expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
        });

        it('should handle phrase suggestions with exactMatch true', () => {
            const exactMatchSuggestions = {
                ...mockSearchSuggestions,
                phraseSuggestions: [
                    {
                        name: 'exact match',
                        link: '/search?q=exact',
                        exactMatch: true, // This should prevent "Did you mean" from showing
                    },
                ],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={exactMatchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Should NOT render "Did you mean" when exactMatch is true
            expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
        });

        it('should handle Boolean conversion for all array types', () => {
            // Test the specific Boolean() calls that were added to fix the "0" display bug
            const testCases = [
                // Empty arrays (length = 0, should be falsy)
                {
                    categorySuggestions: [],
                    productSuggestions: [],
                    phraseSuggestions: [],
                    searchPhrase: 'test',
                },
                // Arrays with content (length > 0, should be truthy)
                {
                    categorySuggestions: [{ name: 'Cat', link: '/cat' }],
                    productSuggestions: [{ name: 'Prod', link: '/prod', price: 10 }],
                    phraseSuggestions: [{ name: 'Phrase', link: '/phrase', exactMatch: false }],
                    searchPhrase: 'test',
                },
            ];

            testCases.forEach((suggestions) => {
                const { container } = renderWithRouter(
                    <SearchSuggestionsSection searchSuggestions={suggestions} closeAndNavigate={mockCloseAndNavigate} />
                );

                // Should never render the number "0" anywhere
                expect(container.textContent).not.toContain('0');
            });
        });

        it('should cover all conditional branches in phrase suggestions display', () => {
            // Test phrase suggestions with exactMatch false to ensure "Did you mean" shows
            const nonExactMatchSuggestions = {
                searchPhrase: 'misspelled',
                categorySuggestions: [],
                productSuggestions: [],
                phraseSuggestions: [
                    {
                        name: 'corrected spelling',
                        link: '/search?q=corrected%20spelling',
                        exactMatch: false, // This should show "Did you mean"
                    },
                ],
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={nonExactMatchSuggestions}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            // Should render "Did you mean" when exactMatch is false
            expect(screen.getAllByText(/Did you mean/)).toHaveLength(2); // Mobile and desktop
            expect(screen.getAllByText('corrected spelling?')).toHaveLength(2);
        });

        it('should test all navigation callback scenarios', () => {
            const mockCallback = vi.fn();

            renderWithRouter(
                <SearchSuggestionsSection searchSuggestions={mockSearchSuggestions} closeAndNavigate={mockCallback} />
            );

            // Test clicking "View All" link
            const viewAllLink = screen.getByText('View All');
            fireEvent.click(viewAllLink);
            expect(mockCallback).toHaveBeenCalledWith('/search?q=test%20search');

            // Test clicking phrase suggestion
            const phraseLinks = screen.getAllByText('test search corrected?');
            fireEvent.click(phraseLinks[0]);
            expect(mockCallback).toHaveBeenCalledWith('/search?q=test%20search%20corrected');

            // Verify callback was called the correct number of times
            expect(mockCallback).toHaveBeenCalledTimes(2);
        });

        it('should handle edge case with null searchPhrase in URL building', () => {
            const suggestionsWithNullPhrase = {
                ...mockSearchSuggestions,
                searchPhrase: null,
            };

            renderWithRouter(
                <SearchSuggestionsSection
                    searchSuggestions={suggestionsWithNullPhrase}
                    closeAndNavigate={mockCloseAndNavigate}
                />
            );

            const viewAllLink = screen.getByText('View All');
            fireEvent.click(viewAllLink);

            // Should handle null searchPhrase gracefully
            expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=');
        });
    });
});
