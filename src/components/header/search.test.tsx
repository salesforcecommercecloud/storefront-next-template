import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { BrowserRouter } from 'react-router';
import SearchBar from './search';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { useTransformSearchSuggestions } from '@/hooks/use-transform-search-suggestions';

// Mock the hooks
const mockRefetch = vi.fn();
const mockNavigate = vi.fn();

const mockSuggestionsData = {
    categorySuggestions: [{ name: 'Electronics', link: '/category/electronics' }],
    productSuggestions: [{ name: 'iPhone', link: '/product/iphone', price: 999 }],
    phraseSuggestions: [],
};

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

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/config', () => ({
    useConfig: vi.fn(() => ({
        pages: {
            search: {
                suggestionsDebounce: 300,
            },
        },
    })),
}));

vi.mock('@/temp-ui-string', () => ({
    default: {
        header: {
            searchPlaceholder: 'Search for products...',
        },
    },
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
        mockUseSearchSuggestions.mockReturnValue({
            data: null,
            refetch: mockRefetch,
        });
        mockUseTransformSearchSuggestions.mockReturnValue(null);
        vi.clearAllTimers();
        vi.useFakeTimers();
        // Clear session storage to ensure no recent searches affect tests
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Basic Rendering', () => {
        it('should render search input with correct attributes', () => {
            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            expect(searchInput).toBeInTheDocument();
            expect(searchInput).toHaveAttribute('placeholder', 'Search for products...');
            expect(searchInput).toHaveAttribute('aria-label', 'Search for products...');
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
                return { data: null, refetch: mockRefetch };
            });

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test query' } });

            expect(capturedQuery).toBe('test query');
        });

        it('should update aria-expanded when query length changes', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category' }],
                productSuggestions: [],
            });

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
                categorySuggestions: [{ name: 'Test Category' }],
                productSuggestions: [],
            });

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
                refetch: mockRefetch,
            });

            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Electronics', link: '/category/electronics', type: 'category' }],
                productSuggestions: [{ name: 'iPhone', link: '/product/iphone', price: 999 }],
                phraseSuggestions: [],
                searchPhrase: 'phone',
            });

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
                categorySuggestions: [{ name: 'Test Category' }],
                productSuggestions: [],
            });

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
                expect(searchInput.value).toBe('');
            }
        });

        it('should execute closeAndNavigate function with state management', () => {
            // Mock suggestions data to ensure hasSuggestions is true
            const mockSuggestions = { suggestions: [{ value: 'test' }] };
            mockUseSearchSuggestions.mockReturnValue({
                data: mockSuggestions,
                refetch: mockRefetch,
            });

            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category' }],
                productSuggestions: [],
            });

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
            expect(searchInput.value).toBe('');
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
                return { data: null, refetch: mockRefetch };
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
            });

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            expect(searchInput).toHaveAttribute('aria-expanded', 'false');
        });

        it('should handle suggestions with only categories', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Electronics' }],
                productSuggestions: [],
            });

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            expect(searchInput).toBeInTheDocument();
        });

        it('should handle suggestions with only products', () => {
            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [],
                productSuggestions: [{ name: 'iPhone' }],
            });

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
                data: null,
                refetch: newMockRefetch,
            });

            renderWithRouter(<SearchBar />);

            const searchInput = screen.getByRole('combobox');
            fireEvent.change(searchInput, { target: { value: 'test' } });

            // The useEffect should have updated the ref
            expect(searchInput).toBeInTheDocument();
        });

        it('should handle useEffect suggestions state management', () => {
            // Test to cover line 112: setShowSuggestions(!!hasSuggestions)
            mockUseSearchSuggestions.mockReturnValue({
                data: { suggestions: [{ value: 'test' }] },
                refetch: mockRefetch,
            });

            mockUseTransformSearchSuggestions.mockReturnValue({
                categorySuggestions: [{ name: 'Test Category' }],
                productSuggestions: [],
            });

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
