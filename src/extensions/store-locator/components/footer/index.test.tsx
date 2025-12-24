import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import StoreLocatorFooter from './index';
import { ConfigProvider } from '@/config';
import { mockConfig } from '@/test-utils/config';
import StoreLocatorProvider from '@/extensions/store-locator/providers/store-locator';

// Helper to render with router and necessary providers
const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <ConfigProvider config={mockConfig}>
                        <StoreLocatorProvider>{component}</StoreLocatorProvider>
                    </ConfigProvider>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('StoreLocatorFooter', () => {
    it('renders Store Locator link', () => {
        renderWithRouter(<StoreLocatorFooter />);
        const link = screen.getByRole('link', { name: /store locator/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/store-locator');
    });
});
