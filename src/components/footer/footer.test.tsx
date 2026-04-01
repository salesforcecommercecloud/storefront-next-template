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
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig, SITE_PREFIX } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { SiteProvider, type Site } from '@salesforce/storefront-next-runtime/multi-site';
import Footer from './index';

// Mock categories data
const mockCategories: ShopperProducts.schemas['Category'] = {
    id: 'root',
    name: 'Root',
    categories: [
        { id: 'mens', name: "Men's" },
        { id: 'womens', name: "Women's" },
        { id: 'electronics', name: 'Electronics' },
    ],
};

const mockSite: Site = {
    id: 'RefArchGlobal',
    defaultLocale: 'en-GB',
    defaultCurrency: 'GBP',
    supportedLocales: [
        { id: 'en-GB', preferredCurrency: 'GBP' },
        { id: 'it-IT', preferredCurrency: 'EUR' },
    ],
    supportedCurrencies: ['EUR', 'GBP'],
};

// Helper function to render component with router context
const renderWithRouter = (component: React.ReactElement, currency: string = 'USD') => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <ConfigProvider config={mockConfig}>
                        <SiteProvider value={mockSite}>
                            <CurrencyProvider value={currency}>{component}</CurrencyProvider>
                        </SiteProvider>
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
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        expect(screen.getByText(t('footer:sections.shop'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.help'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.about'))).toBeInTheDocument();
        // Newsletter title now appears as h2 in prominent section
        expect(screen.getByRole('heading', { name: t('footer:newsletter.title'), level: 2 })).toBeInTheDocument();
    });

    test('renders Shop section with category links', async () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        // Wait for categories to load
        const mensLink = await screen.findByRole('link', { name: "Men's" });
        expect(mensLink).toBeInTheDocument();
        expect(mensLink).toHaveAttribute('href', `${SITE_PREFIX}/category/mens`);

        const womensLink = screen.getByRole('link', { name: "Women's" });
        expect(womensLink).toBeInTheDocument();
        expect(womensLink).toHaveAttribute('href', `${SITE_PREFIX}/category/womens`);

        const electronicsLink = screen.getByRole('link', { name: 'Electronics' });
        expect(electronicsLink).toBeInTheDocument();
        expect(electronicsLink).toHaveAttribute('href', `${SITE_PREFIX}/category/electronics`);
    });

    test('renders Help section links', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        // Help section now includes Contact Us, Shipping, Order Status, and Sign in
        const contactLink = screen.getByRole('link', { name: t('footer:links.contactUs') });
        expect(contactLink).toBeInTheDocument();
        expect(contactLink).toHaveAttribute('href', `${SITE_PREFIX}/contact`);

        const shippingLink = screen.getByRole('link', { name: t('footer:links.shipping') });
        expect(shippingLink).toBeInTheDocument();
        expect(shippingLink).toHaveAttribute('href', `${SITE_PREFIX}/shipping`);
        expect(shippingLink).toHaveAttribute('href', `${SITE_PREFIX}/shipping`);

        const orderStatusLink = screen.getByRole('link', { name: t('footer:links.orderStatus') });
        expect(orderStatusLink).toBeInTheDocument();
        expect(orderStatusLink).toHaveAttribute('href', `${SITE_PREFIX}/orders`);

        const signInLink = screen.getByRole('link', { name: t('footer:links.signInOrCreateAccount') });
        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', `${SITE_PREFIX}/login`);
    });

    test('renders Our Company section links', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        const aboutUsLink = screen.getByRole('link', { name: t('footer:links.aboutUs') });
        expect(aboutUsLink).toBeInTheDocument();
        expect(aboutUsLink).toHaveAttribute('href', `${SITE_PREFIX}/about-us`);
    });

    test('renders social media links with correct aria-labels and hrefs', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

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

    test('renders newsletter section with signup form', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        // Check for newsletter title and description
        expect(screen.getByRole('heading', { name: t('footer:newsletter.title'), level: 2 })).toBeInTheDocument();
        expect(screen.getByText(t('footer:newsletter.description'))).toBeInTheDocument();

        // Check for Signup form elements
        expect(screen.getByPlaceholderText(t('footer:newsletter.emailPlaceholder'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('footer:newsletter.subscribeButton') })).toBeInTheDocument();
    });

    test('renders all selectors, Locale and Currency Switcher', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        // Check for Locale and Currency switchers
        const selectors = screen.getAllByRole('combobox');
        expect(selectors).toHaveLength(2);
    });

    test('renders LocaleSwitcher component with locale options', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);
        expect(screen.getByRole('option', { name: 'English (UK)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Italian (Italy)' })).toBeInTheDocument();
    });

    test('renders copyright text with current year', () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        const currentYear = new Date().getFullYear();
        const copyrightText = `© ${currentYear} ${t('footer:copyright')}`;

        expect(screen.getByText(copyrightText)).toBeInTheDocument();
    });

    test('renders footer element with theme-aware classes', () => {
        const { container } = renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />, 'USD');

        const footer = container.querySelector('footer');
        expect(footer).toBeInTheDocument();

        // Footer should have mt-auto class
        expect(footer).toHaveClass('mt-auto');

        // Newsletter section should have primary background
        const newsletterSection = footer?.querySelector('.bg-primary');
        expect(newsletterSection).toBeInTheDocument();

        // Links section should have footer background
        const linksSection = footer?.querySelector('.bg-footer-background');
        expect(linksSection).toBeInTheDocument();
    });

    test('all navigation links have proper styling classes', async () => {
        renderWithRouter(<Footer categories={Promise.resolve(mockCategories)} />);

        const contactLink = screen.getByRole('link', { name: t('footer:links.contactUs') });
        expect(contactLink).toHaveClass('text-sm');
        expect(contactLink).toHaveClass('text-muted-foreground');
        expect(contactLink).toHaveClass('hover:text-foreground');
        expect(contactLink).toHaveClass('transition-colors');

        const shippingLink = screen.getByRole('link', { name: t('footer:links.shipping') });
        expect(shippingLink).toHaveClass('text-sm');
        expect(shippingLink).toHaveClass('transition-colors');

        const orderStatusLink = screen.getByRole('link', { name: t('footer:links.orderStatus') });
        expect(orderStatusLink).toHaveClass('text-sm');
        expect(orderStatusLink).toHaveClass('transition-colors');

        // Check category links as well
        const mensLink = await screen.findByRole('link', { name: "Men's" });
        expect(mensLink).toHaveClass('text-sm');
        expect(mensLink).toHaveClass('transition-colors');
    });

    test('renders without categories prop', () => {
        renderWithRouter(<Footer />);

        // Footer should still render with Shop section header but no category links
        expect(screen.getByText(t('footer:sections.shop'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.help'))).toBeInTheDocument();
        expect(screen.getByText(t('footer:sections.about'))).toBeInTheDocument();
    });
});
