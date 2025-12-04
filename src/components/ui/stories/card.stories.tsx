import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '../card';
import { action } from 'storybook/actions';
import { Button } from '../button';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logHeaderAction = action('card-header-action');
        const logFooterSave = action('card-footer-save');
        const logFooterCancel = action('card-footer-cancel');
        const logProductAdd = action('card-product-add');
        const logSettingsToggle = action('card-settings-toggle');
        const logSettingsEnable = action('card-settings-enable');
        const logCardAction = action('card-action');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const button = target.closest('button');
            if (!button) return;

            // Only log for clicks inside a Card
            const card = button.closest('[data-slot="card"]');
            if (!card) return;

            const label = (button.textContent || '').trim();

            // Header action area
            if (button.closest('[data-slot="card-action"]')) {
                logHeaderAction({ label });
                return;
            }

            // Footer actions
            if (button.closest('[data-slot="card-footer"]')) {
                if (/^save(\s|$)|save changes/i.test(label)) {
                    logFooterSave({ label });
                    return;
                }
                if (/^cancel(\s|$)/i.test(label)) {
                    logFooterCancel({ label });
                    return;
                }
                logCardAction({ area: 'footer', label });
                return;
            }

            // Common button labels used across stories
            if (/add to cart/i.test(label)) {
                logProductAdd({ label });
                return;
            }
            if (/^toggle$/i.test(label)) {
                logSettingsToggle({ label });
                return;
            }
            if (/^enable$/i.test(label)) {
                logSettingsEnable({ label });
                return;
            }

            // Fallback
            logCardAction({ label });
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A flexible card component with header, content, and footer sections. Includes specialized components for title, description, and action areas.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that footer card heading is displayed
        const heading = canvas.getByRole('heading', { name: 'Card with Footer' });
        await expect(heading).toBeInTheDocument();

        // Test that both Cancel and Save buttons are present in footer
        const cancelButton = canvas.getByRole('button', { name: /cancel/i });
        const saveButton = canvas.getByRole('button', { name: /save/i });
        await expect(cancelButton).toBeInTheDocument();
        await expect(saveButton).toBeInTheDocument();

        // Test that buttons are in footer section
        const footer = cancelButton.closest('[data-slot="card-footer"]');
        await expect(footer).toBeInTheDocument();

        // Test button interactions
        await userEvent.click(saveButton);
        await userEvent.click(cancelButton);
    },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
                <p>
                    This is the main content of the card. It can contain any type of content including text, images,
                    forms, or other components.
                </p>
            </CardContent>
            <CardFooter>
                <Button>Action</Button>
            </CardFooter>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that card title is displayed
        const title = canvas.getByText('Card Title');
        await expect(title).toBeInTheDocument();

        // Test that card description is displayed
        const description = canvas.getByText('Card description goes here');
        await expect(description).toBeInTheDocument();

        // Test that card content is displayed
        const content = canvas.getByText(/main content of the card/i);
        await expect(content).toBeInTheDocument();

        // Test that action button is present and clickable
        const actionButton = canvas.getByRole('button', { name: /action/i });
        await expect(actionButton).toBeInTheDocument();
        await expect(actionButton).not.toBeDisabled();

        // Test button interaction
        await userEvent.click(actionButton);
    },
};

export const WithAction: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Card with Action</CardTitle>
                <CardDescription>This card has an action button in the header</CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm">
                        Edit
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <p>
                    This card demonstrates how to use the CardAction component to add action buttons to the header area.
                </p>
            </CardContent>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that card title for action variant is displayed
        const title = canvas.getByText('Card with Action');
        await expect(title).toBeInTheDocument();

        // Test that edit button is present in header action area
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test that CardAction component is used (edit button should be in header)
        const header = editButton.closest('[data-slot="card-header"]');
        await expect(header).toBeInTheDocument();

        // Test edit button interaction
        await userEvent.click(editButton);
    },
};

export const Simple: Story = {
    render: () => (
        <Card>
            <CardContent>
                <p>This is a simple card with just content. No header or footer needed.</p>
            </CardContent>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that simple card content is displayed
        const content = canvas.getByText('This is a simple card with just content. No header or footer needed.');
        await expect(content).toBeInTheDocument();

        // Test that no header elements are present
        const title = canvas.queryByRole('heading');
        await expect(title).not.toBeInTheDocument();

        // Test that no footer buttons are present
        const buttons = canvas.queryAllByRole('button');
        await expect(buttons).toHaveLength(0);

        // Verify card renders correctly
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const HeaderOnly: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Header Only</CardTitle>
                <CardDescription>This card only has a header section</CardDescription>
            </CardHeader>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that header-only card title is displayed
        const title = canvas.getByText('Header Only');
        await expect(title).toBeInTheDocument();

        // Test that header description is displayed
        const description = canvas.getByText('This card only has a header section');
        await expect(description).toBeInTheDocument();

        // Test that no content section is present
        const contentSection = canvas.queryByText(/content|body/i);
        await expect(contentSection).not.toBeInTheDocument();

        // Test that no footer is present
        const buttons = canvas.queryAllByRole('button');
        await expect(buttons).toHaveLength(0);

        // Verify card renders correctly
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const ContentOnly: Story = {
    render: () => (
        <Card>
            <CardContent>
                <h3 className="text-lg font-semibold mb-2">Content Only Card</h3>
                <p>This card demonstrates content without header or footer sections.</p>
                <ul className="mt-4 space-y-2">
                    <li>• Feature one</li>
                    <li>• Feature two</li>
                    <li>• Feature three</li>
                </ul>
            </CardContent>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that content-only card heading is displayed
        const heading = canvas.getByRole('heading', { name: 'Content Only Card' });
        await expect(heading).toBeInTheDocument();

        // Test that content text is displayed
        const content = canvas.getByText('This card demonstrates content without header or footer sections.');
        await expect(content).toBeInTheDocument();

        // Test that list items are present
        const listItems = canvas.getAllByText(/^• Feature/);
        await expect(listItems).toHaveLength(3);

        // Test that no CardHeader section is present (the h3 is in content, not header)
        const cardHeader = canvasElement.querySelector('[data-slot="card-header"]');
        await expect(cardHeader).toBeNull(); // CardHeader should not be present

        // Test that the heading is in the content area, not header
        const headingInContent = heading.closest('[data-slot="card-content"]');
        await expect(headingInContent).toBeInTheDocument(); // Heading should be in content area

        // Test that content text is displayed
        const headerDesc = canvas.getByText(/content without header/i);
        await expect(headerDesc).toBeInTheDocument(); // This should be in content, not header

        // Test that no footer buttons are present
        const buttons = canvas.queryAllByRole('button');
        await expect(buttons).toHaveLength(0);
    },
};

export const WithFooter: Story = {
    render: () => (
        <Card>
            <CardContent>
                <h3 className="text-lg font-semibold mb-2">Card with Footer</h3>
                <p>This card has both content and a footer with action buttons.</p>
            </CardContent>
            <CardFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
            </CardFooter>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that footer card heading is displayed
        const heading = canvas.getByRole('heading', { name: 'Card with Footer' });
        await expect(heading).toBeInTheDocument();

        // Test that both Cancel and Save buttons are present in footer
        const cancelButton = canvas.getByRole('button', { name: /cancel/i });
        const saveButton = canvas.getByRole('button', { name: /save/i });
        await expect(cancelButton).toBeInTheDocument();
        await expect(saveButton).toBeInTheDocument();

        // Test that buttons are in footer section
        const footer = cancelButton.closest('[data-slot="card-footer"]');
        await expect(footer).toBeInTheDocument();

        // Test button interactions
        await userEvent.click(saveButton);
        await userEvent.click(cancelButton);
    },
};

export const ProductCard: Story = {
    render: () => (
        <Card className="max-w-sm">
            <CardHeader>
                <CardTitle>Product Name</CardTitle>
                <CardDescription>$99.99</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-square bg-muted rounded-lg mb-4" />
                <p className="text-sm text-muted-foreground">Product description goes here</p>
            </CardContent>
            <CardFooter>
                <Button className="w-full">Add to Cart</Button>
            </CardFooter>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that product card title is displayed
        const title = canvas.getByText('Product Name');
        await expect(title).toBeInTheDocument();

        // Test that product price is displayed
        const price = canvas.getByText('$99.99');
        await expect(price).toBeInTheDocument();

        // Test that product description is displayed
        const description = canvas.getByText('Product description goes here');
        await expect(description).toBeInTheDocument();

        // Test that Add to Cart button is present
        const addToCartButton = canvas.getByRole('button', { name: /add to cart/i });
        await expect(addToCartButton).toBeInTheDocument();

        // Test button interaction
        await userEvent.click(addToCartButton);
    },
};

export const SettingsCard: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive updates about your account</p>
                    </div>
                    <Button variant="outline" size="sm">
                        Toggle
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">
                        Enable
                    </Button>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
            </CardFooter>
        </Card>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that settings card title is displayed
        const title = canvas.getByText('Account Settings');
        await expect(title).toBeInTheDocument();

        // Test that settings description is displayed
        const description = canvas.getByText('Manage your account preferences and security settings');
        await expect(description).toBeInTheDocument();

        // Test that setting options are present
        const emailNotifications = canvas.getByText('Email Notifications');
        const twoFactorAuth = canvas.getByText('Two-Factor Authentication');
        await expect(emailNotifications).toBeInTheDocument();
        await expect(twoFactorAuth).toBeInTheDocument();

        // Test that setting buttons are present
        const toggleButton = canvas.getByRole('button', { name: /toggle/i });
        const enableButton = canvas.getByRole('button', { name: /enable/i });
        await expect(toggleButton).toBeInTheDocument();
        await expect(enableButton).toBeInTheDocument();

        // Test that footer buttons are present
        const cancelButton = canvas.getByRole('button', { name: /cancel/i });
        const saveButton = canvas.getByRole('button', { name: /save changes/i });
        await expect(cancelButton).toBeInTheDocument();
        await expect(saveButton).toBeInTheDocument();

        // Test button interactions
        await userEvent.click(toggleButton);
        await userEvent.click(enableButton);
        await userEvent.click(saveButton);
    },
};

export const MultipleCards: Story = {
    render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Card 1</CardTitle>
                    <CardDescription>First card in the grid</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Content for the first card</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Card 2</CardTitle>
                    <CardDescription>Second card in the grid</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Content for the second card</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Card 3</CardTitle>
                    <CardDescription>Third card in the grid</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Content for the third card</p>
                </CardContent>
            </Card>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that all three cards are displayed
        const card1Title = canvas.getByText('Card 1');
        const card2Title = canvas.getByText('Card 2');
        const card3Title = canvas.getByText('Card 3');
        await expect(card1Title).toBeInTheDocument();
        await expect(card2Title).toBeInTheDocument();
        await expect(card3Title).toBeInTheDocument();

        // Test that card descriptions are displayed
        const card1Desc = canvas.getByText('First card in the grid');
        const card2Desc = canvas.getByText('Second card in the grid');
        const card3Desc = canvas.getByText('Third card in the grid');
        await expect(card1Desc).toBeInTheDocument();
        await expect(card2Desc).toBeInTheDocument();
        await expect(card3Desc).toBeInTheDocument();

        // Test that card contents are displayed
        const card1Content = canvas.getByText('Content for the first card');
        const card2Content = canvas.getByText('Content for the second card');
        const card3Content = canvas.getByText('Content for the third card');
        await expect(card1Content).toBeInTheDocument();
        await expect(card2Content).toBeInTheDocument();
        await expect(card3Content).toBeInTheDocument();

        // Test that grid container is present
        const grid = canvasElement.querySelector('.grid');
        void expect(grid).toBeInTheDocument();

        // Verify multiple cards render correctly
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that card title is displayed
        const title = canvas.getByText('Card Title');
        await expect(title).toBeInTheDocument();

        // Test that card description is displayed
        const description = canvas.getByText('Card description goes here');
        await expect(description).toBeInTheDocument();

        // Test that card content is displayed
        const content = canvas.getByText(/main content of the card/i);
        await expect(content).toBeInTheDocument();

        // Test that action button is present and clickable
        const actionButton = canvas.getByRole('button', { name: /action/i });
        await expect(actionButton).toBeInTheDocument();
        await expect(actionButton).not.toBeDisabled();

        // Test button interaction
        await userEvent.click(actionButton);
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that card title is displayed
        const title = canvas.getByText('Card Title');
        await expect(title).toBeInTheDocument();

        // Test that card description is displayed
        const description = canvas.getByText('Card description goes here');
        await expect(description).toBeInTheDocument();

        // Test that card content is displayed
        const content = canvas.getByText(/main content of the card/i);
        await expect(content).toBeInTheDocument();

        // Test that action button is present and clickable
        const actionButton = canvas.getByRole('button', { name: /action/i });
        await expect(actionButton).toBeInTheDocument();
        await expect(actionButton).not.toBeDisabled();

        // Test button interaction
        await userEvent.click(actionButton);
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that card title is displayed
        const title = canvas.getByText('Card Title');
        await expect(title).toBeInTheDocument();

        // Test that card description is displayed
        const description = canvas.getByText('Card description goes here');
        await expect(description).toBeInTheDocument();

        // Test that card content is displayed
        const content = canvas.getByText(/main content of the card/i);
        await expect(content).toBeInTheDocument();

        // Test that action button is present and clickable
        const actionButton = canvas.getByRole('button', { name: /action/i });
        await expect(actionButton).toBeInTheDocument();
        await expect(actionButton).not.toBeDisabled();

        // Test button interaction
        await userEvent.click(actionButton);
    },
};
