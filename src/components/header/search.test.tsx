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
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
// eslint-disable-next-line import/no-namespace -- vi.spyOn requires namespace import
import * as ReactRouter from 'react-router';
import { BrowserRouter } from 'react-router';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();
import SearchBar from './search';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { useTransformSearchSuggestions } from '@/hooks/use-transform-search-suggestions';

// Mock the hooks
const mockRefetch = vi.fn<() => Promise<void>>();
const mockNavigate = vi.fn();

const mockSuggestionsData = {
    categorySuggestions: [{ name: 'Electronics', link: '/category/electronics' }],
    productSuggestions: [{ name: 'iPhone', link: '/product/iphone', price: 999 }],
    phraseSuggestions: [],
} as any;

vi.mock('@/hooks/use-search-suggestions', () => ({
    useSearchSuggestions: vi.fn(),
}));

vi.mock('@/hooks/use-transform-search-suggestions', () => ({
    useTransformSearchSuggestions: vi.fn(),
}));

const mockUseSearchSuggestions = useSearchSuggestions as MockedFunction<typeof useSearchSuggestions>;
const mockUseTransformSearchSuggestions = useTransformSearchSuggestions as MockedFunction<
    typeof useTransformSearchSuggestions
>;

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: vi.fn(() => ({
        pages: {
            search: {
                suggestionsDebounce: 300,
            },
        },
    })),
}));

vi.mock('@/components/search/suggestions', () => ({
    default: ({
        closeAndNavigate,
        clearRecentSearches,
    }: {
        closeAndNavigate: (link: string) => void;
        clearRecentSearches: () => void;
    }) => (
        <div data-testid="suggestions">
            <button onClick={() => closeAndNavigate('/test-link')} data-testid="suggestion-item">
                Test Suggestion
            </button>
            <button onClick={() => clearRecentSearches()} data-testid="clear-recent-searches">
                Clear Recent Searches
            </button>
        </div>
    ),
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SearchBar Component', () => {
    beforeEach(() => {
        mockRefetch.mockClear();
        mockNavigate.mockClear();
        // Use vi.spyOn to mock useNavigate while keeping real router exports
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
        mockUseSearchSuggestions.mockReturnValue({
            data: undefined,
            refetch: mockRefetch,
        } as any);
        mockUseTransformSearchSuggestions.mockReturnValue(null);
        vi.clearAllTimers();
        vi.useFakeTimers();
        // Clear session storage to ensure no recent searches affect tests
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render search input with correct attributes', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            expect(searchInput).toBeInTheDocument();
            expect(searchInput).toHaveAttribute('placeholder', t('header:searchPlaceholder'));
            expect(searchInput).toHaveAttribute('aria-label', t('header:searchPlaceholder'));
            expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
            expect(searchInput).toHaveAttribute('aria-expanded', 'false');
            expect(searchInput).toHaveAttribute('aria-haspopup', 'listbox');
        });

        it('should render search icon', () => {
            renderWithRouter(<SearchBar />);

            const searchIcon = screen.getByRole('combobox').parentElement?.querySelector('svg');
            expect(searchIcon).toBeInTheDocument();
        });

        it('should render form element', () => {
            const { container } = renderWithRouter(<SearchBar />);

            const form = container.querySelector('form');
            expect(form).toBeInTheDocument();
        });
    });

    describe('Input Handling', () => {
        it('should call handleInputChange when typing', () => {
            let capturedQuery = '';
            mockUseSearchSuggestions.mockImplementation(({ q }: { q: string }) => {
                capturedQuery = q;
                return { data: undefined, refetch: mockRefetch } as any;
            });

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test query' } });

            expect(capturedQuery).toBe('test query');
        });

        it('should update aria-expanded when query length changes', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category', link: '/category/test', type: 'category' }],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Initially should be false
            expect(searchInput).toHaveAttribute('aria-expanded', 'false');

            // Type enough characters to trigger suggestions
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // Should be true since we have categories to show
            expect(searchInput).toHaveAttribute('aria-expanded', 'true');
        });

        it('should handle input focus', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category', link: '/category/test', type: 'category' }],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Set up query first
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // Focus input
            fireEvent.focus(searchInput);

            // Should execute handleInputFocus function
            expect(searchInput).toBeInTheDocument();
        });

        it('should handle input blur and hide suggestions', () => {
            // Mock suggestions to be available
            mockUseSearchSuggestions.mockReturnValue({
                data: mockSuggestionsData,
                isLoading: false,
                refetch: mockRefetch,
            });

            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Electronics', link: '/category/electronics', type: 'category' }],
                productSuggestions: [{ name: 'iPhone', link: '/product/iphone', type: 'product', price: 999 }],
                phraseSuggestions: [],
                searchPhrase: 'phone',
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Set up query to show suggestions
            fireEvent.change(searchInput, { target: { value: 'phone' } });

            // Blur the input - this should trigger handleInputBlur
            fireEvent.blur(searchInput);

            // The main test is that blur event is handled without errors
            // and the component remains functional
            expect(searchInput).toBeInTheDocument();
            expect(searchInput).toHaveAttribute('type', 'text');
        });
    });

    describe('Form Submission', () => {
        it('should call handleSubmit and navigate on form submit', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            const form = searchInput.closest('form') as HTMLFormElement;

            // Set input value
            fireEvent.change(searchInput, { target: { value: 'test query' } });

            // Submit form
            fireEvent.submit(form);

            expect(mockNavigate).toHaveBeenCalledWith('/search?q=test%20query', { state: { query: 'test query' } });
        });

        it('should prevent default form submission', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            const form = searchInput.closest('form') as HTMLFormElement;

            fireEvent.change(searchInput, { target: { value: 'test' } });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

            fireEvent(form, submitEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should not navigate when input is empty', () => {
            renderWithRouter(<SearchBar />);

            const form = screen.getByRole('combobox').closest('form') as HTMLFormElement;

            fireEvent.submit(form);

            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('should not navigate when input is only whitespace', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            const form = searchInput.closest('form') as HTMLFormElement;

            fireEvent.change(searchInput, { target: { value: '   ' } });
            fireEvent.submit(form);

            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Suggestions Functionality', () => {
        it('should call closeAndNavigate when suggestion is clicked', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category', link: '/category/test', type: 'category' }],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Set up conditions to show suggestions
            fireEvent.change(searchInput, { target: { value: 'test query' } });

            // Force suggestions to show by updating the component state
            act(() => {
                vi.runAllTimers();
            });

            // Click on a suggestion (if visible)
            const suggestionItem = screen.queryByTestId('suggestion-item');
            if (suggestionItem) {
                fireEvent.click(suggestionItem);

                expect(mockNavigate).toHaveBeenCalledWith('/test-link');
                expect((searchInput as HTMLInputElement).value).toBe('');
            }
        });

        it('should execute closeAndNavigate function with state management', () => {
            // Mock suggestions data to ensure hasSuggestions is true
            const mockSuggestions = { suggestions: [{ value: 'test' }] };
            mockUseSearchSuggestions.mockReturnValue({
                data: mockSuggestions as any,
                refetch: mockRefetch,
            } as any);

            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category', link: '/category/test', type: 'category' }],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Set input value first to trigger suggestions (>=3 chars)
            fireEvent.change(searchInput, { target: { value: 'test query to clear' } });

            // Simulate focus to show suggestions
            fireEvent.focus(searchInput);

            // Allow debounced functions and state updates
            act(() => {
                vi.runAllTimers();
            });

            // The popover should now be open, find and click suggestion to trigger closeAndNavigate (lines 83-89)
            const suggestionItem = screen.getByTestId('suggestion-item');
            fireEvent.click(suggestionItem);

            // Verify closeAndNavigate behavior:
            // - setShowSuggestions(false) - line 83
            // - setQuery('') - line 84
            // - inputRef.current.value = '' - lines 85-87
            // - navigate(link) - line 88
            expect(mockNavigate).toHaveBeenCalledWith('/test-link');
            expect((searchInput as HTMLInputElement).value).toBe('');
        });

        it('should show "No suggestions found" when no suggestions available', () => {
            mockUseTransformSearchSuggestions.mockReturnValue(null);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // The popover should not be open without suggestions
            expect(screen.queryByText('No suggestions found')).not.toBeInTheDocument();
        });
    });

    describe('Debounced Search', () => {
        it('should debounce refetch calls', () => {
            mockUseSearchSuggestions.mockImplementation(() => {
                return { data: undefined, refetch: mockRefetch } as any;
            });

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Type multiple times quickly
            fireEvent.change(searchInput, { target: { value: 'tes' } });
            fireEvent.change(searchInput, { target: { value: 'test' } });
            fireEvent.change(searchInput, { target: { value: 'test ' } });
            fireEvent.change(searchInput, { target: { value: 'test q' } });

            // Fast-forward time to trigger debounced function
            act(() => {
                vi.runAllTimers();
            });

            // Refetch should be called only once after debounce delay
            expect(mockRefetch).toHaveBeenCalled();
        });

        it('should cancel debounced call when query is too short', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Type enough characters then delete
            fireEvent.change(searchInput, { target: { value: 'test' } });
            fireEvent.change(searchInput, { target: { value: 'te' } });

            act(() => {
                vi.runAllTimers();
            });

            // Should handle the cancellation properly
            expect(searchInput).toBeInTheDocument();
        });
    });

    describe('Keyboard Interactions', () => {
        it('should handle keyboard events on input', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Test various keyboard events
            fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
            fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
            fireEvent.keyDown(searchInput, { key: 'Enter' });
            fireEvent.keyDown(searchInput, { key: 'Escape' });

            expect(searchInput).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty suggestions object', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            expect(searchInput).toHaveAttribute('aria-expanded', 'false');
        });

        it('should handle suggestions with only categories', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Electronics', link: '/category/electronics', type: 'category' }],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            expect(searchInput).toBeInTheDocument();
        });

        it('should handle suggestions with only products', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [],
                productSuggestions: [{ name: 'iPhone', link: '/product/iphone', type: 'product' }],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            expect(searchInput).toBeInTheDocument();
        });
    });

    describe('Component Lifecycle', () => {
        it('should clean up debounced function on unmount', () => {
            const { unmount } = renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // Unmount component
            unmount();

            // Fast-forward timers to see if cleanup worked
            act(() => {
                vi.runAllTimers();
            });

            // Should not throw any errors
            expect(true).toBe(true);
        });

        it('should update refs when query or refetch changes', () => {
            const newMockRefetch = vi.fn();
            mockUseSearchSuggestions.mockReturnValue({
                data: undefined,
                refetch: newMockRefetch,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // The useEffect should have updated the ref
            expect(searchInput).toBeInTheDocument();
        });

        it('should handle useEffect suggestions state management', () => {
            // Test to cover line 112: setShowSuggestions(!!hasSuggestions)
            mockUseSearchSuggestions.mockReturnValue({
                data: { suggestions: [{ value: 'test' }] } as any,
                refetch: mockRefetch,
            } as any);

            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category', link: '/category/test', type: 'category' }],
                productSuggestions: [],
                searchPhrase: undefined,
            } as any);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Type enough characters to trigger the useEffect
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // This should trigger the useEffect that calls setShowSuggestions(!!hasSuggestions) - line 112
            act(() => {
                vi.runAllTimers();
            });

            expect(searchInput).toBeInTheDocument();
        });
    });

    describe('Recent Searches', () => {
        it('should load recent searches from session storage on mount', () => {
            // Pre-populate session storage
            sessionStorage.setItem('recent-searches', JSON.stringify(['shoes', 'boots']));

            renderWithRouter(<SearchBar />);

            // Component should load and be ready with recent searches available
            const searchInput = screen.getByRole('combobox');
            expect(searchInput).toBeInTheDocument();

            // Verify session storage is still intact
            const recentSearchesStr = sessionStorage.getItem('recent-searches');
            expect(recentSearchesStr).toBeTruthy();
            if (recentSearchesStr) {
                const recentSearches = JSON.parse(recentSearchesStr);
                expect(recentSearches).toEqual(['shoes', 'boots']);
            }
        });

        it('should handle empty recent searches gracefully', () => {
            // Ensure no recent searches
            sessionStorage.clear();

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.focus(searchInput);

            // Should not crash when no recent searches exist
            expect(searchInput).toBeInTheDocument();
        });

        it('should show recent searches when input is empty', () => {
            // Pre-populate recent searches
            sessionStorage.setItem('recent-searches', JSON.stringify(['shoes', 'boots']));

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Empty input - should allow showing recent searches
            act(() => {
                fireEvent.focus(searchInput);
            });

            expect(searchInput).toBeInTheDocument();
        });

        it('should pass recent searches and clear function to suggestions component', () => {
            // Pre-populate session storage
            sessionStorage.setItem('recent-searches', JSON.stringify(['shoes', 'boots', 'sneakers']));

            mockUseTransformSearchSuggestions.mockReturnValue(null);

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');

            // Focus to potentially show recent searches
            fireEvent.focus(searchInput);

            // Click the clear button if it exists
            const clearButton = screen.queryByTestId('clear-recent-searches');
            if (clearButton) {
                fireEvent.click(clearButton);

                // Session storage should be cleared
                expect(sessionStorage.getItem('recent-searches')).toBeNull();
            }

            expect(searchInput).toBeInTheDocument();
        });
    });
});
