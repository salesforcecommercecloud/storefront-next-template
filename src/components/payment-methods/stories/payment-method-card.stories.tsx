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
import { PaymentMethodCard, type PaymentMethod } from '../payment-method-card';

const meta: Meta<typeof PaymentMethodCard> = {
    title: 'Components/Payment Methods/Payment Method Card',
    component: PaymentMethodCard,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const visaCard: PaymentMethod = {
    id: '1',
    type: 'visa',
    last4: '4242',
    expiryMonth: '12',
    expiryYear: '2026',
    cardholderName: 'John Doe',
    isDefault: false,
};

const mastercardCard: PaymentMethod = {
    id: '2',
    type: 'mastercard',
    last4: '5555',
    expiryMonth: '06',
    expiryYear: '2027',
    cardholderName: 'Jane Smith',
    isDefault: false,
};

export const Visa: Story = {
    args: {
        paymentMethod: visaCard,
        onRemove: action('onRemove'),
        onSetDefault: action('onSetDefault'),
    },
};

export const Mastercard: Story = {
    args: {
        paymentMethod: mastercardCard,
        onRemove: action('onRemove'),
        onSetDefault: action('onSetDefault'),
    },
};

export const DefaultCard: Story = {
    args: {
        paymentMethod: {
            ...visaCard,
            isDefault: true,
        },
        onRemove: action('onRemove'),
        onSetDefault: action('onSetDefault'),
    },
};
