import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { getTranslation } from '@/lib/i18next';
import i18next from 'i18next';
import { ConfigProvider } from '@/config';

const { t } = getTranslation();

// Mock config with i18n settings
const mockConfig = {
    i18n: {
        fallbackLng: 'en-US',
        supportedLngs: ['en-US', 'es-MX'],
    },
} as any;

const mockFetcherSubmit = vi.fn();
const mockFetcher = {
    submit: mockFetcherSubmit,
    state: 'idle' as const,
    data: null,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    text: undefined,
    formData: undefined,
    json: undefined,
    Form: vi.fn(),
    load: vi.fn(),
};

// Mock useFetcher at the module level
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useFetcher: () => mockFetcher,
    };
});

// Import the component after the mock is set up
const { default: LocaleSwitcher } = await import('./index');

// Helper function to render component with router context
const renderWithRouter = ({ initialLanguage = 'en-US' }: { initialLanguage?: string } = {}) => {
    // Set the initial language in i18next
    void i18next.changeLanguage(initialLanguage);

    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <ConfigProvider config={mockConfig}>
                        <LocaleSwitcher />
                    </ConfigProvider>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );

    return render(<RouterProvider router={router} />);
};

describe('LocaleSwitcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to English before each test
        void i18next.changeLanguage('en-US');
    });

    test('renders a language selector with proper accessibility label', () => {
        renderWithRouter();

        const selector = screen.getByRole('combobox', {
            name: t('localeSwitcher:ariaLabel'),
        });
        expect(selector).toBeInTheDocument();
    });

    test('displays English and Spanish language options', () => {
        renderWithRouter();

        expect(screen.getByRole('option', { name: t('localeSwitcher:locales.en-US') })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: t('localeSwitcher:locales.es-MX') })).toBeInTheDocument();
    });

    test('shows current language as selected when initialized with English', () => {
        renderWithRouter({ initialLanguage: 'en-US' });

        const selector = screen.getByRole('combobox');
        expect(selector).toHaveValue('en-US');
    });

    test('shows current language as selected when initialized with Spanish', () => {
        renderWithRouter({ initialLanguage: 'es-MX' });

        const selector = screen.getByRole('combobox');
        expect(selector).toHaveValue('es-MX');
    });

    test('changes displayed language when user selects a new language', async () => {
        const user = userEvent.setup();
        renderWithRouter({ initialLanguage: 'en-US' });

        const selector = screen.getByRole('combobox');
        expect(selector).toHaveValue('en-US');

        // Change to Spanish
        await user.selectOptions(selector, 'es-MX');

        // Verify the language changed in i18next
        await waitFor(() => {
            expect(i18next.language).toBe('es-MX');
        });

        // Verify the selector shows the new value
        expect(selector).toHaveValue('es-MX');
    });

    test('changes from Spanish to English when user selects English', async () => {
        const user = userEvent.setup();
        renderWithRouter({ initialLanguage: 'es-MX' });

        const selector = screen.getByRole('combobox');
        expect(selector).toHaveValue('es-MX');

        // Change to English
        await user.selectOptions(selector, 'en-US');

        // Verify the language changed in i18next
        await waitFor(() => {
            expect(i18next.language).toBe('en-US');
        });

        expect(selector).toHaveValue('en-US');
    });

    test('submits locale change to server action', async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const selector = screen.getByRole('combobox');
        await user.selectOptions(selector, 'es-MX');

        // Wait for the submit to be called
        await waitFor(() => {
            expect(mockFetcherSubmit).toHaveBeenCalled();
        });

        // Verify the submit was called with correct parameters
        const submitCall = mockFetcherSubmit.mock.calls[0];
        const formData = submitCall[0] as FormData;
        const options = submitCall[1];

        expect(formData.get('locale')).toBe('es-MX');
        expect(options).toEqual({
            method: 'POST',
            action: '/action/set-locale',
        });
    });

    test('has correct English option value', () => {
        renderWithRouter();

        const englishOption = screen.getByRole('option', { name: t('localeSwitcher:locales.en-US') });
        expect(englishOption).toHaveValue('en-US');
    });

    test('has correct Spanish option value', () => {
        renderWithRouter();

        const spanishOption = screen.getByRole('option', { name: t('localeSwitcher:locales.es-MX') });
        expect(spanishOption).toHaveValue('es-MX');
    });

    test('language selector is keyboard accessible', async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const selector = screen.getByRole('combobox');

        // Tab to the selector
        await user.tab();
        expect(selector).toHaveFocus();

        // For native select elements, we can use selectOptions even when focused
        await user.selectOptions(selector, 'es-MX');

        // The selection should change
        await waitFor(() => {
            expect(selector).toHaveValue('es-MX');
        });
    });

    test('renders without crashing when language is changed multiple times', async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const selector = screen.getByRole('combobox');

        // Change to Spanish
        await user.selectOptions(selector, 'es-MX');
        await waitFor(() => {
            expect(selector).toHaveValue('es-MX');
        });

        // Change back to English
        await user.selectOptions(selector, 'en-US');
        await waitFor(() => {
            expect(selector).toHaveValue('en-US');
        });

        // Change to Spanish again
        await user.selectOptions(selector, 'es-MX');
        await waitFor(() => {
            expect(selector).toHaveValue('es-MX');
        });

        // Component should still be rendered and functional
        expect(selector).toBeInTheDocument();
    });

    test('maintains selected language when re-rendered', async () => {
        const user = userEvent.setup();
        const { rerender } = renderWithRouter();

        const selector = screen.getByRole('combobox');
        await user.selectOptions(selector, 'es-MX');

        await waitFor(() => {
            expect(selector).toHaveValue('es-MX');
        });

        // Re-render the component
        rerender(
            <RouterProvider
                router={createMemoryRouter([
                    {
                        path: '/',
                        element: (
                            <ConfigProvider config={mockConfig}>
                                <LocaleSwitcher />
                            </ConfigProvider>
                        ),
                    },
                ])}
            />
        );

        // The language should persist
        const updatedSelector = screen.getByRole('combobox');
        expect(updatedSelector).toHaveValue('es-MX');
    });
});
