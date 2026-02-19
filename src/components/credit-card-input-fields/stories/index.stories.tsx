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
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { CreditCardInputFields } from '../index';

interface CreditCardFormData {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
}

function CreditCardInputFieldsWrapper(args: { autoFocus?: boolean }) {
    const form = useForm<CreditCardFormData>({
        defaultValues: {
            cardNumber: '',
            cardholderName: '',
            expiryDate: '',
            cvv: '',
        },
    });

    return (
        <Form {...form}>
            <form className="space-y-4">
                <CreditCardInputFields form={form} autoFocus={args.autoFocus} />
            </form>
        </Form>
    );
}

const meta: Meta<typeof CreditCardInputFields> = {
    title: 'Components/Credit Card Input Fields',
    component: CreditCardInputFieldsWrapper,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        autoFocus: false,
    },
};

export const WithAutoFocus: Story = {
    args: {
        autoFocus: true,
    },
};
