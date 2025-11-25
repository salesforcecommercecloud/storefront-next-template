import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import RecentSearches from './recent-searches';

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('RecentSearches Component', () => {
    const mockCloseAndNavigate = vi.fn();
    const mockClearRecentSearches = vi.fn();

    beforeEach(() => {
        mockCloseAndNavigate.mockClear();
        mockClearRecentSearches.mockClear();
    });

    it('should render empty wrapper when no recent searches', () => {
        const { container } = renderWithRouter(
            <RecentSearches
                recentSearches={[]}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        const wrapper = container.querySelector('.p-6');
        expect(wrapper).toBeInTheDocument();
        expect(screen.queryByText('Recent Searches')).not.toBeInTheDocument();
    });

    it('should render empty wrapper when recentSearches is undefined', () => {
        const { container } = renderWithRouter(
            <RecentSearches
                recentSearches={undefined}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        const wrapper = container.querySelector('.p-6');
        expect(wrapper).toBeInTheDocument();
        expect(screen.queryByText('Recent Searches')).not.toBeInTheDocument();
    });

    it('should render recent searches when provided', () => {
        const recentSearches = ['shoes', 'boots', 'sneakers'];

        renderWithRouter(
            <RecentSearches
                recentSearches={recentSearches}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
        expect(screen.getByText('shoes')).toBeInTheDocument();
        expect(screen.getByText('boots')).toBeInTheDocument();
        expect(screen.getByText('sneakers')).toBeInTheDocument();
    });

    it('should call closeAndNavigate when a recent search is clicked', () => {
        const recentSearches = ['shoes'];

        renderWithRouter(
            <RecentSearches
                recentSearches={recentSearches}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        const searchButton = screen.getByText('shoes');
        fireEvent.mouseDown(searchButton);

        expect(mockCloseAndNavigate).toHaveBeenCalledWith('/search?q=shoes');
    });

    it('should call clearRecentSearches when clear button is clicked', () => {
        const recentSearches = ['shoes', 'boots'];

        renderWithRouter(
            <RecentSearches
                recentSearches={recentSearches}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        const clearButton = screen.getByText('Clear recent searches');
        fireEvent.mouseDown(clearButton);

        expect(mockClearRecentSearches).toHaveBeenCalled();
    });

    it('should render multiple recent searches correctly', () => {
        const recentSearches = ['search 1', 'search 2', 'search 3', 'search 4', 'search 5'];

        renderWithRouter(
            <RecentSearches
                recentSearches={recentSearches}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        recentSearches.forEach((search) => {
            expect(screen.getByText(search)).toBeInTheDocument();
        });

        expect(screen.getByText('Clear recent searches')).toBeInTheDocument();
    });

    it('should render with proper styling classes', () => {
        const recentSearches = ['test'];

        const { container } = renderWithRouter(
            <RecentSearches
                recentSearches={recentSearches}
                closeAndNavigate={mockCloseAndNavigate}
                clearRecentSearches={mockClearRecentSearches}
            />
        );

        const wrapper = container.querySelector('.p-6');
        expect(wrapper).toBeInTheDocument();
    });
});
