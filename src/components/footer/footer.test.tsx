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
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ConfigProvider } from '@/config';
import { mockConfig } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';
import Footer from './index';

// Helper function to render component with router context
const renderWithRouter = (component: React.ReactElement, currency: string = 'USD') => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <ConfigProvider config={mockConfig}>
                        <CurrencyProvider value={currency}>{component}</CurrencyProvider>
                    </ConfigProvider>
                ),
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return render(<RouterProvider router={router} />);
};

describe('Footer', () => {
    test('renders all section headings', () => {
        renderWithRouter(<Footer />);

        expect(screen.getByText(t('footer:sections.customerSupport'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.account'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.ourCompany'))).toBeInTheDocument();
        // @sfdc-extension-line SFDC_EXT_INTERNAL_THEME_SWITCHER
        expect(screen.getByText(t('footer:sections.switchThemes'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.switchLanguage'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.switchCurrency'))).toBeInTheDocument();
    });

    test('renders Customer Support section links', () => {
        renderWithRouter(<Footer />);

        const contactLink = screen.getByRole('link', { name: t('footer:links.contactUs') });
        expect(contactLink).toBeInTheDocument();
        expect(contactLink).toHaveAttribute('href', '/contact');

        const shippingLink = screen.getByRole('link', { name: t('footer:links.shipping') });
        expect(shippingLink).toBeInTheDocument();
        expect(shippingLink).toHaveAttribute('href', '/shipping');
    });

    test('renders Account section links', () => {
        renderWithRouter(<Footer />);

        const orderStatusLink = screen.getByRole('link', { name: t('footer:links.orderStatus') });
        expect(orderStatusLink).toBeInTheDocument();
        expect(orderStatusLink).toHaveAttribute('href', '/orders');

        const signInLink = screen.getByRole('link', { name: t('footer:links.signInOrCreateAccount') });
        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', '/login');
    });

    test('renders Our Company section links', () => {
        renderWithRouter(<Footer />);

        const aboutUsLink = screen.getByRole('link', { name: t('footer:links.aboutUs') });
        expect(aboutUsLink).toBeInTheDocument();
        expect(aboutUsLink).toHaveAttribute('href', '/about-us');
    });

    test('renders social media links with correct aria-labels and hrefs', () => {
        renderWithRouter(<Footer />);

        const youtubeLink = screen.getByLabelText(t('footer:socialMedia.youtubeLabel'));
        expect(youtubeLink).toBeInTheDocument();
        expect(youtubeLink).toHaveAttribute('href', 'https://youtube.com/channel/UCSTGHqzR1Q9yAVbiS3dAFHg');

        const instagramLink = screen.getByLabelText(t('footer:socialMedia.instagramLabel'));
        expect(instagramLink).toBeInTheDocument();
        expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/commercecloud');

        const xLink = screen.getByLabelText(t('footer:socialMedia.xLabel'));
        expect(xLink).toBeInTheDocument();
        expect(xLink).toHaveAttribute('href', 'https://x.com/CommerceCloud');

        const facebookLink = screen.getByLabelText(t('footer:socialMedia.facebookLabel'));
        expect(facebookLink).toBeInTheDocument();
        expect(facebookLink).toHaveAttribute('href', 'https://facebook.com/CommerceCloud/');
    });

    test('renders Signup component content', () => {
        renderWithRouter(<Footer />);

        // Check for Signup component content
        expect(screen.getByText('Be the first to know')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Your email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
    });

    test('renders all selectors, Theme (if installed), Locale and Currency Switcher', () => {
        renderWithRouter(<Footer />);

        // Check for ThemeSwitcher select and options
        const selectors = screen.getAllByRole('combobox');
        let expectedLength = 2;
        // @sfdc-extension-line SFDC_EXT_INTERNAL_THEME_SWITCHER
        expectedLength += 2; // Theme switcher now has 2 selectors (family and mode)
        expect(selectors).toHaveLength(expectedLength);
    });

    // @sfdc-extension-block-start SFDC_EXT_INTERNAL_THEME_SWITCHER
    test('renders ThemeSwitcher component with theme family and mode options', () => {
        renderWithRouter(<Footer />);
        // Theme family options
        expect(screen.getByRole('option', { name: t('themeSwitcher:marketStreet') })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: t('themeSwitcher:foundations') })).toBeInTheDocument();
        // Theme mode options
        expect(screen.getByRole('option', { name: t('themeSwitcher:lightTheme') })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: t('themeSwitcher:darkTheme') })).toBeInTheDocument();
    });
    // @sfdc-extension-block-end SFDC_EXT_INTERNAL_THEME_SWITCHER

    test('renders LocaleSwitcher component with locale options', () => {
        renderWithRouter(<Footer />);
        expect(screen.getByRole('option', { name: 'English (UK)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Italian (Italy)' })).toBeInTheDocument();
    });

    test('renders copyright text with current year', () => {
        renderWithRouter(<Footer />);

        const currentYear = new Date().getFullYear();
        const copyrightText = `© ${currentYear} ${t('footer:copyright')}`;

        expect(screen.getByText(copyrightText)).toBeInTheDocument();
    });

    test('renders footer element with theme-aware classes', () => {
        const { container } = renderWithRouter(<Footer />);

        const footer = container.querySelector('footer');
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveClass('bg-footer-background');
    });

    test('all navigation links have hover:underline class', () => {
        renderWithRouter(<Footer />);

        const contactLink = screen.getByRole('link', { name: t('footer:links.contactUs') });
        expect(contactLink).toHaveClass('hover:underline');

        const shippingLink = screen.getByRole('link', { name: t('footer:links.shipping') });
        expect(shippingLink).toHaveClass('hover:underline');

        const orderStatusLink = screen.getByRole('link', { name: t('footer:links.orderStatus') });
        expect(orderStatusLink).toHaveClass('hover:underline');
    });
});
