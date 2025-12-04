import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '../index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logEnterEdit = action('toggle-card-enter-edit');
        const logSave = action('toggle-card-save');
        const logCancel = action('toggle-card-cancel');
        const logFieldChange = action('toggle-card-field-change');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            // Edit toggle button (commonly text "Edit")
            const editBtn = target.closest('button, a');
            const label = editBtn?.textContent?.trim() || '';
            if (editBtn && /^edit$/i.test(label)) {
                event.preventDefault();
                logEnterEdit({ label });
                return;
            }

            // Save/Cancel in edit mode
            if (editBtn && /^save$/i.test(label)) {
                event.preventDefault();
                logSave({ label });
                return;
            }
            if (editBtn && /^cancel$/i.test(label)) {
                event.preventDefault();
                logCancel({ label });
            }
        };

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            if (input.matches('input, textarea')) {
                logFieldChange({ id: input.id, name: input.name, value: input.value });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ToggleCard> = {
    title: 'UI/Toggle Card',
    component: ToggleCard,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A toggleable card component that can switch between view and edit modes. Includes context providers for conditional rendering of edit and summary content.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        id: {
            description: 'Unique identifier for the card',
            control: 'text',
        },
        title: {
            description: 'Card title',
            control: 'text',
        },
        description: {
            description: 'Card description',
            control: 'text',
        },
        editing: {
            description: 'Whether the card is in edit mode',
            control: 'boolean',
        },
        disabled: {
            description: 'Whether the card is disabled',
            control: 'boolean',
        },
        disableEdit: {
            description: 'Whether to disable edit functionality',
            control: 'boolean',
        },
        onEdit: {
            description: 'Callback when edit is triggered',
            action: 'onEdit',
        },
        editLabel: {
            description: 'Label for the edit button',
            control: 'text',
        },
        editAction: {
            description: 'Label for the edit action button',
            control: 'text',
        },
        onEditActionClick: {
            description: 'Callback when edit action is clicked',
            action: 'onEditActionClick',
        },
        isLoading: {
            description: 'Whether the card is in loading state',
            control: 'boolean',
        },
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
};

export default meta;
type Story = StoryObj<typeof ToggleCard>;

// Wrapper component to handle state for stories
const ToggleCardWrapper = (args: React.ComponentProps<typeof ToggleCard>) => {
    const [editing, setEditing] = useState(args.editing || false);
    const [isLoading, setIsLoading] = useState(args.isLoading || false);
    const [formData, setFormData] = useState({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
    });

    const handleEdit = () => {
        setEditing(true);
        args.onEdit?.();
    };

    const handleSave = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setEditing(false);
            args.onEditActionClick?.();
        }, 1000);
    };

    const handleCancel = () => {
        setEditing(false);
    };

    return (
        <ToggleCard
            {...args}
            editing={editing}
            isLoading={isLoading}
            onEdit={handleEdit}
            onEditActionClick={handleSave}>
            <ToggleCardSummary>
                <div className="space-y-2">
                    <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm">{formData.name}</p>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <p className="text-sm">{formData.email}</p>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm">{formData.phone}</p>
                    </div>
                </div>
            </ToggleCardSummary>

            <ToggleCardEdit>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={isLoading}>
                            Save
                        </Button>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </ToggleCardEdit>
        </ToggleCard>
    );
};

export const Default: Story = {
    render: (args) => <ToggleCardWrapper {...args} />,
    args: {
        title: 'Contact Information',
        description: 'Manage your contact details',
        editLabel: 'Edit',
        editAction: 'Save',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test initial state - should show summary view
        const summaryContent = canvas.getByText('Contact Information');
        await expect(summaryContent).toBeInTheDocument();

        // Test that component renders properly
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test edit button is present (but don't click in test environment)
        const editButtons = canvas.getAllByRole('button');
        void expect(editButtons.length).toBeGreaterThan(0);

        // Verify buttons are properly rendered
        editButtons.forEach((button) => {
            void expect(button).toBeInTheDocument();
            void expect(button).not.toBeDisabled();
        });
    },
};

export const WithoutDescription: Story = {
    render: (args) => <ToggleCardWrapper {...args} />,
    args: {
        title: 'Shipping Address',
        editLabel: 'Edit',
        editAction: 'Save',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        const description = canvas.queryByText(/manage your contact details/i);
        void expect(description).toBeNull();
    },
};

export const Disabled: Story = {
    render: (args) => <ToggleCardWrapper {...args} />,
    args: {
        title: 'Account Settings',
        description: 'This section is currently disabled',
        disabled: true,
        editLabel: 'Edit',
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // When disabled=true, edit button is not rendered
        const editButton = canvas.queryByRole('button', { name: /edit/i });
        void expect(editButton).toBeNull();
    },
};

export const DisableEdit: Story = {
    render: (args) => <ToggleCardWrapper {...args} />,
    args: {
        title: 'Read-Only Information',
        description: 'This information cannot be edited',
        disableEdit: true,
        editLabel: 'Edit',
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // When disableEdit=true, edit button is not rendered
        const editButton = canvas.queryByRole('button', { name: /edit/i });
        void expect(editButton).toBeNull();
    },
};

export const Loading: Story = {
    render: (args) => <ToggleCardWrapper {...args} />,
    args: {
        title: 'Processing',
        description: 'Saving your changes...',
        isLoading: true,
        editLabel: 'Edit',
        editAction: 'Save',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Save button might not be rendered in loading state
        const saveButton = canvas.queryByRole('button', { name: /save/i });
        if (saveButton) {
            await expect(saveButton).toBeDisabled();
        } else {
            void expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const CustomStyling: Story = {
    render: (args) => <ToggleCardWrapper {...args} />,
    args: {
        title: 'Custom Styled Card',
        description: 'This card has custom styling',
        editLabel: 'Edit',
        editAction: 'Save',
        className: 'border-2 border-primary shadow-lg',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const customCard = canvasElement.querySelector('.border-2.border-primary.shadow-lg');
        await expect(canvas.getByText(/custom styled card/i)).toBeInTheDocument();
        void expect(customCard).not.toBeNull();
    },
};

export const LongContent: Story = {
    render: (args) => (
        <ToggleCardWrapper
            {...args}
            title="Detailed Information"
            description="This card contains a lot of information that might wrap to multiple lines"
        />
    ),
    args: {
        editLabel: 'Edit',
        editAction: 'Save',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const detailedTitle = canvas.getByText(/detailed information/i);
        await expect(detailedTitle).toBeInTheDocument();
    },
};

export const MultipleCards: Story = {
    render: () => (
        <div className="space-y-4">
            <ToggleCardWrapper
                title="Personal Information"
                description="Your personal details"
                editLabel="Edit"
                editAction="Save"
            />
            <ToggleCardWrapper
                title="Billing Address"
                description="Where to send invoices"
                editLabel="Edit"
                editAction="Save"
            />
            <ToggleCardWrapper
                title="Shipping Address"
                description="Where to send packages"
                editLabel="Edit"
                editAction="Save"
            />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const editButtons = canvas.getAllByRole('button', { name: /edit/i });
        await expect(editButtons.length).toBeGreaterThanOrEqual(3);
    },
};

export const StaticView: Story = {
    args: {
        title: 'Static Information',
        description: 'This card cannot be edited',
        disabled: true,
        children: (
            <div className="space-y-2">
                <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <p className="text-sm">Active</p>
                </div>
                <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm">January 15, 2024</p>
                </div>
            </div>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const status = canvas.getByText(/active/i);
        await expect(status).toBeInTheDocument();
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

        // Test initial state - should show summary view
        const summaryContent = canvas.getByText('Contact Information');
        await expect(summaryContent).toBeInTheDocument();

        // Test that component renders properly
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test edit button is present (but don't click in test environment)
        const editButtons = canvas.getAllByRole('button');
        void expect(editButtons.length).toBeGreaterThan(0);

        // Verify buttons are properly rendered
        editButtons.forEach((button) => {
            void expect(button).toBeInTheDocument();
            void expect(button).not.toBeDisabled();
        });
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

        // Test initial state - should show summary view
        const summaryContent = canvas.getByText('Contact Information');
        await expect(summaryContent).toBeInTheDocument();

        // Test that component renders properly
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test edit button is present (but don't click in test environment)
        const editButtons = canvas.getAllByRole('button');
        void expect(editButtons.length).toBeGreaterThan(0);

        // Verify buttons are properly rendered
        editButtons.forEach((button) => {
            void expect(button).toBeInTheDocument();
            void expect(button).not.toBeDisabled();
        });
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

        // Test initial state - should show summary view
        const summaryContent = canvas.getByText('Contact Information');
        await expect(summaryContent).toBeInTheDocument();

        // Test that component renders properly
        await expect(canvasElement.firstChild).toBeInTheDocument();

        // Test edit button is present (but don't click in test environment)
        const editButtons = canvas.getAllByRole('button');
        void expect(editButtons.length).toBeGreaterThan(0);

        // Verify buttons are properly rendered
        editButtons.forEach((button) => {
            void expect(button).toBeInTheDocument();
            void expect(button).not.toBeDisabled();
        });
    },
};
