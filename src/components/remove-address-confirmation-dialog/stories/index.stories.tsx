import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemoveAddressConfirmationDialog } from '../index';
import { action } from 'storybook/actions';

const meta: Meta<typeof RemoveAddressConfirmationDialog> = {
    title: 'DIALOG/RemoveAddressConfirmationDialog',
    component: RemoveAddressConfirmationDialog,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Confirmation dialog for removing customer addresses with integrated SCAPI fetcher. Handles success and error states with toast notifications.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {
        open: {
            description: 'Whether the dialog is open',
            control: 'boolean',
        },
        onOpenChange: {
            description: 'Callback when dialog open state changes',
            action: 'onOpenChange',
        },
        addressId: {
            description: 'The address ID to remove',
            control: 'text',
        },
        customerId: {
            description: 'Customer ID for the remove operation',
            control: 'text',
        },
        onSuccess: {
            description: 'Callback when remove succeeds',
            action: 'onSuccess',
        },
    },
};

export default meta;
type Story = StoryObj<typeof RemoveAddressConfirmationDialog>;

export const Default: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        addressId: 'Home',
        customerId: 'customer-123',
        onSuccess: action('onSuccess'),
    },
};

export const Closed: Story = {
    args: {
        open: false,
        onOpenChange: action('onOpenChange'),
        addressId: 'Work',
        customerId: 'customer-123',
        onSuccess: action('onSuccess'),
    },
};
