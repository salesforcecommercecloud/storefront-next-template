import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Footer from './index';
import uiStrings from '@/temp-ui-string';

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

describe('Footer', () => {
    test('renders all section headings', () => {
        renderWithRouter(<Footer />);

        expect(screen.getByText(uiStrings.footer.sections.customerSupport)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.footer.sections.account)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.footer.sections.ourCompany)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.footer.sections.switchThemes)).toBeInTheDocument();
    });

    test('renders Customer Support section links', () => {
        renderWithRouter(<Footer />);

        const contactLink = screen.getByRole('link', { name: uiStrings.footer.links.contactUs });
        expect(contactLink).toBeInTheDocument();
        expect(contactLink).toHaveAttribute('href', '/contact');

        const shippingLink = screen.getByRole('link', { name: uiStrings.footer.links.shipping });
        expect(shippingLink).toBeInTheDocument();
        expect(shippingLink).toHaveAttribute('href', '/shipping');
    });

    test('renders Account section links', () => {
        renderWithRouter(<Footer />);

        const orderStatusLink = screen.getByRole('link', { name: uiStrings.footer.links.orderStatus });
        expect(orderStatusLink).toBeInTheDocument();
        expect(orderStatusLink).toHaveAttribute('href', '/orders');

        const signInLink = screen.getByRole('link', { name: uiStrings.footer.links.signInOrCreateAccount });
        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', '/login');
    });

    test('renders Our Company section links', () => {
        renderWithRouter(<Footer />);

        // Store locator link uses extension UI string
        const storeLocatorLink = screen.getByRole('link', { name: /store locator/i });
        expect(storeLocatorLink).toBeInTheDocument();
        expect(storeLocatorLink).toHaveAttribute('href', '/store-locator');

        const aboutUsLink = screen.getByRole('link', { name: uiStrings.footer.links.aboutUs });
        expect(aboutUsLink).toBeInTheDocument();
        expect(aboutUsLink).toHaveAttribute('href', '/about');
    });

    test('renders social media links with correct aria-labels and hrefs', () => {
        renderWithRouter(<Footer />);

        const youtubeLink = screen.getByLabelText(uiStrings.footer.socialMedia.youtubeLabel);
        expect(youtubeLink).toBeInTheDocument();
        expect(youtubeLink).toHaveAttribute('href', 'https://youtube.com/channel/UCSTGHqzR1Q9yAVbiS3dAFHg');

        const instagramLink = screen.getByLabelText(uiStrings.footer.socialMedia.instagramLabel);
        expect(instagramLink).toBeInTheDocument();
        expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/commercecloud');

        const xLink = screen.getByLabelText(uiStrings.footer.socialMedia.xLabel);
        expect(xLink).toBeInTheDocument();
        expect(xLink).toHaveAttribute('href', 'https://x.com/CommerceCloud');

        const facebookLink = screen.getByLabelText(uiStrings.footer.socialMedia.facebookLabel);
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

    test('renders ThemeSwitcher component with theme options', () => {
        renderWithRouter(<Footer />);

        // Check for ThemeSwitcher select and options
        const themeSelect = screen.getByRole('combobox');
        expect(themeSelect).toBeInTheDocument();

        expect(screen.getByRole('option', { name: 'Light Theme' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Dark Theme' })).toBeInTheDocument();
    });

    test('renders copyright text with current year', () => {
        renderWithRouter(<Footer />);

        const currentYear = new Date().getFullYear();
        const copyrightText = `© ${currentYear} ${uiStrings.footer.copyright}`;

        expect(screen.getByText(copyrightText)).toBeInTheDocument();
    });

    test('renders footer element with correct data-theme attribute', () => {
        const { container } = renderWithRouter(<Footer />);

        const footer = container.querySelector('footer');
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveAttribute('data-theme', 'inverse');
    });

    test('all navigation links have hover:underline class', () => {
        renderWithRouter(<Footer />);

        const contactLink = screen.getByRole('link', { name: uiStrings.footer.links.contactUs });
        expect(contactLink).toHaveClass('hover:underline');

        const shippingLink = screen.getByRole('link', { name: uiStrings.footer.links.shipping });
        expect(shippingLink).toHaveClass('hover:underline');

        const orderStatusLink = screen.getByRole('link', { name: uiStrings.footer.links.orderStatus });
        expect(orderStatusLink).toHaveClass('hover:underline');
    });
});
