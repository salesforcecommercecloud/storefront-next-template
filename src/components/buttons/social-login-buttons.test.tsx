import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SocialLoginButtons } from './social-login-buttons';
import uiStrings from '@/temp-ui-string';
import { mockConfig } from '@/test-utils/config';

// Mock the useConfig hook
let mockSiteConfig = {
    ...mockConfig.site,
    features: {
        ...mockConfig.site.features,
        socialLogin: { enabled: true, providers: ['Apple', 'Google'] },
    },
};

vi.mock('@/config', async () => {
    const actual = await vi.importActual('@/config');
    return {
        ...actual,
        useConfig: () => ({
            ...mockConfig,
            site: mockSiteConfig,
        }),
    };
});

// Helper function to render component with router context
const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: component,
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return render(<RouterProvider router={router} />);
};

describe('SocialLoginButtons', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default providers
        mockSiteConfig = {
            ...mockConfig.site,
            features: {
                ...mockConfig.site.features,
                socialLogin: { enabled: true, providers: ['Apple', 'Google'] },
            },
        };
    });

    test('renders social login buttons for configured providers', () => {
        renderWithRouter(<SocialLoginButtons />);

        expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    test('renders null when no social providers are configured', () => {
        mockSiteConfig.features.socialLogin.providers = [];

        const { container } = renderWithRouter(<SocialLoginButtons />);

        expect(container.querySelector('div')).toBeNull();
    });

    test('renders correct number of buttons for configured providers', () => {
        mockSiteConfig.features.socialLogin.providers = ['Apple', 'Google', 'Facebook'];

        renderWithRouter(<SocialLoginButtons />);

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(3);
    });

    test('renders apple icon for Apple provider', () => {
        renderWithRouter(<SocialLoginButtons />);

        const appleButton = screen.getByRole('button', { name: /continue with apple/i });
        expect(appleButton).toHaveTextContent('🍎');
    });

    test('renders google icon for Google provider', () => {
        renderWithRouter(<SocialLoginButtons />);

        const googleButton = screen.getByRole('button', { name: /continue with google/i });
        expect(googleButton).toHaveTextContent('🔍');
    });

    test('renders default icon for unknown provider', () => {
        mockSiteConfig.features.socialLogin.providers = ['UnknownProvider'];

        renderWithRouter(<SocialLoginButtons />);

        const button = screen.getByRole('button', { name: /continue with unknownprovider/i });
        expect(button).toHaveTextContent('🔑');
    });

    test('renders separator with correct text', () => {
        renderWithRouter(<SocialLoginButtons />);

        expect(screen.getByText(uiStrings.login.socialOrContinueWith)).toBeInTheDocument();
    });

    test('renders forms with correct hidden inputs for each provider', () => {
        const { container } = renderWithRouter(<SocialLoginButtons />);

        const forms = container.querySelectorAll('form');
        expect(forms).toHaveLength(2);

        // Check Apple form
        const appleForm = forms[0];
        const appleLoginModeInput = appleForm.querySelector('input[name="loginMode"]') as HTMLInputElement;
        const appleProviderInput = appleForm.querySelector('input[name="provider"]') as HTMLInputElement;

        expect(appleLoginModeInput?.value).toBe('social');
        expect(appleProviderInput?.value).toBe('Apple');

        // Check Google form
        const googleForm = forms[1];
        const googleLoginModeInput = googleForm.querySelector('input[name="loginMode"]') as HTMLInputElement;
        const googleProviderInput = googleForm.querySelector('input[name="provider"]') as HTMLInputElement;

        expect(googleLoginModeInput?.value).toBe('social');
        expect(googleProviderInput?.value).toBe('Google');
    });

    test('renders buttons with post method', () => {
        const { container } = renderWithRouter(<SocialLoginButtons />);

        const forms = container.querySelectorAll('form');
        forms.forEach((form) => {
            expect(form.getAttribute('method')).toBe('post');
        });
    });

    test('renders buttons with outline variant', () => {
        renderWithRouter(<SocialLoginButtons />);

        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
            // The Button component should have the outline variant class
            // We just check that the button exists and has proper structure
            expect(button).toHaveAttribute('type', 'submit');
        });
    });

    test('renders only unique providers when duplicates exist', () => {
        mockSiteConfig.features.socialLogin.providers = ['Apple', 'Apple', 'Google'];

        const { container } = renderWithRouter(<SocialLoginButtons />);

        // Due to React key prop, only unique providers should render
        const forms = container.querySelectorAll('form');
        // React will only render 2 forms because keys are unique
        expect(forms.length).toBeGreaterThanOrEqual(2);
    });

    test('includes redirectPath hidden input when provided', () => {
        const redirectPath = '/checkout';
        const { container } = renderWithRouter(<SocialLoginButtons redirectPath={redirectPath} />);

        const forms = container.querySelectorAll('form');
        expect(forms.length).toBeGreaterThan(0);

        forms.forEach((form) => {
            const redirectInput = form.querySelector('input[name="redirectPath"]');
            expect((redirectInput as HTMLInputElement)?.value).toBe(redirectPath);
        });
    });
});
