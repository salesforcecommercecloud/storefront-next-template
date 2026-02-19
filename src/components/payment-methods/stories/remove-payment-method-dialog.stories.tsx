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

import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { RemovePaymentMethodDialog } from '../remove-payment-method-dialog';
import type { PaymentMethod } from '../payment-method-card';

const meta: Meta<typeof RemovePaymentMethodDialog> = {
    title: 'Components/Payment Methods/Remove Payment Method Dialog',
    component: RemovePaymentMethodDialog,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockPaymentMethod: PaymentMethod = {
    id: '1',
    type: 'visa',
    last4: '4242',
    expiryMonth: '12',
    expiryYear: '2026',
    cardholderName: 'John Doe',
    isDefault: false,
};

const mockDefaultPaymentMethod: PaymentMethod = {
    ...mockPaymentMethod,
    isDefault: true,
};

export const Default: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        paymentMethod: mockPaymentMethod,
        onConfirm: action('onConfirm'),
    },
};

export const DefaultCard: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        paymentMethod: mockDefaultPaymentMethod,
        onConfirm: action('onConfirm'),
    },
};
