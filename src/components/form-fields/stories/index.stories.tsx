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
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NativeSelectOption } from '@/components/ui/native-select';
import { FormInput, FormNativeSelect } from '../index';

interface DemoFormData {
    email: string;
    name: string;
    country: string;
}

const demoSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    name: z.string().min(1, 'Name is required'),
    country: z.string().min(1, 'Country is required'),
});

function FormFieldsDemo({ triggerValidation = false }: { triggerValidation?: boolean }) {
    const form = useForm<DemoFormData>({
        resolver: zodResolver(demoSchema),
        defaultValues: { email: '', name: '', country: 'US' },
    });

    return (
        <Form {...form}>
            <form
                data-testid="form-fields-demo"
                className="space-y-4"
                onSubmit={(e) => void form.handleSubmit(() => {})(e)}>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name*</FormLabel>
                            <FormInput placeholder="Enter your name" autoComplete="name" {...field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email*</FormLabel>
                            <FormInput type="email" placeholder="Enter your email" autoComplete="email" {...field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem className="[&_[data-slot=native-select-wrapper]]:w-full">
                            <FormLabel>Country*</FormLabel>
                            <FormNativeSelect aria-label="Country" {...field}>
                                <NativeSelectOption value="US">United States</NativeSelectOption>
                                <NativeSelectOption value="CA">Canada</NativeSelectOption>
                                <NativeSelectOption value="GB">United Kingdom</NativeSelectOption>
                            </FormNativeSelect>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {triggerValidation && (
                    <button type="submit" data-testid="submit-btn">
                        Submit
                    </button>
                )}
            </form>
        </Form>
    );
}

const meta: Meta = {
    title: 'Components/Form Fields',
    component: FormInput,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div className="p-8 max-w-md w-80">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default form with FormInput and FormNativeSelect fields.
 */
export const Default: Story = {
    render: () => <FormFieldsDemo />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const nameInput = canvas.getByPlaceholderText('Enter your name');
        await expect(nameInput).toHaveAttribute('data-slot', 'input');
        await expect(nameInput).toHaveAttribute('aria-invalid', 'false');
        await expect(nameInput).not.toHaveAttribute('aria-describedby');

        const emailInput = canvas.getByPlaceholderText('Enter your email');
        await expect(emailInput).toHaveAttribute('data-slot', 'input');

        const countrySelect = canvas.getByRole('combobox', { name: 'Country' });
        await expect(countrySelect).toHaveAttribute('data-slot', 'native-select');
    },
};

/**
 * Demonstrates validation errors with aria-describedby linked to error messages.
 */
export const WithValidationErrors: Story = {
    render: () => <FormFieldsDemo triggerValidation />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const nameInput = canvas.getByPlaceholderText('Enter your name');
        await expect(nameInput).toHaveAttribute('aria-invalid', 'false');
        await expect(nameInput).not.toHaveAttribute('aria-describedby');

        const submitBtn = canvas.getByTestId('submit-btn');
        await userEvent.click(submitBtn);

        await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        await expect(nameInput).toHaveAttribute('aria-describedby');

        const errors = canvas.getAllByText(/is required/i);
        await expect(errors.length).toBeGreaterThanOrEqual(2);
    },
};
