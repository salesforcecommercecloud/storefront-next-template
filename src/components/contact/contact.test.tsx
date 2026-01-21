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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { getTranslation } from '@/lib/i18next';
import Contact from './index';

const { t } = getTranslation();
const mockAddToast = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: (namespace?: string | string[]) => ({
        t: (key: string, options?: Record<string, unknown>) => {
            const ns = Array.isArray(namespace) ? namespace[0] : namespace;
            if (ns && !key.includes(':')) {
                return t(`${ns}:${key}`, options);
            }
            return t(key, options);
        },
        i18n: { language: 'en-US' },
    }),
}));

vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

const renderWithRouter = () => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: <Contact />,
            },
        ],
        { initialEntries: ['/'] }
    );

    return render(<RouterProvider router={router} />);
};

describe('Contact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders contact details and form fields', () => {
        renderWithRouter();

        expect(screen.getByRole('heading', { name: t('aboutUs:contact.title') })).toBeInTheDocument();
        expect(screen.getByText(t('aboutUs:contact.intro'))).toBeInTheDocument();

        const phoneLink = screen.getByRole('link', { name: t('aboutUs:contact.phoneDisplay') });
        expect(phoneLink).toHaveAttribute('href', t('aboutUs:contact.phoneHref'));

        expect(screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.fullName'))).toBeInTheDocument();
        expect(screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.email'))).toBeInTheDocument();
        expect(screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.topic'))).toBeInTheDocument();
        expect(screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.message'))).toBeInTheDocument();
    });

    test('marks required fields and email attributes', () => {
        renderWithRouter();

        const nameInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.fullName'));
        expect(nameInput).toHaveAttribute('required');

        const emailInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.email'));
        expect(emailInput).toHaveAttribute('required');
        expect(emailInput).toHaveAttribute('type', 'email');
        expect(emailInput).toHaveAttribute('autoComplete', 'email');

        const topicInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.topic'));
        expect(topicInput).toHaveAttribute('required');

        const messageInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.message'));
        expect(messageInput).toHaveAttribute('required');
    });

    test('shows a success toast after submit', async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const nameInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.fullName'));
        const emailInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.email'));
        const topicInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.topic'));
        const messageInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.message'));

        await user.type(nameInput, 'Jane Doe');
        await user.type(emailInput, 'jane@example.com');
        await user.type(topicInput, 'General');
        await user.type(messageInput, 'Hello there');

        await user.click(screen.getByRole('button', { name: t('aboutUs:contact.form.submit') })); // Submit the form
        expect(mockAddToast).toHaveBeenCalledWith(t('aboutUs:contact.toast.success'), 'success');
    });

    test('clears the form after submit', async () => {
        const user = userEvent.setup();
        renderWithRouter();

        const nameInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.fullName'));
        const emailInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.email'));
        const topicInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.topic'));
        const messageInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.message'));

        await user.type(nameInput, 'Jane Doe');
        await user.type(emailInput, 'jane@example.com');
        await user.type(topicInput, 'General');
        await user.type(messageInput, 'Hello there');

        await user.click(screen.getByRole('button', { name: t('aboutUs:contact.form.submit') }));

        expect(nameInput).toHaveValue('');
        expect(emailInput).toHaveValue('');
        expect(topicInput).toHaveValue('');
        expect(messageInput).toHaveValue('');
    });

    test.each([
        ['name', t('aboutUs:contact.form.placeholders.fullName')],
        ['email', t('aboutUs:contact.form.placeholders.email')],
        ['topic', t('aboutUs:contact.form.placeholders.topic')],
        ['message', t('aboutUs:contact.form.placeholders.message')],
    ])('marks missing required %s field as invalid', async (missingField) => {
        const user = userEvent.setup();
        renderWithRouter();

        const nameInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.fullName'));
        const emailInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.email'));
        const topicInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.topic'));
        const messageInput = screen.getByPlaceholderText(t('aboutUs:contact.form.placeholders.message'));

        const fieldMap = {
            name: nameInput,
            email: emailInput,
            topic: topicInput,
            message: messageInput,
        } as const;

        if (missingField !== 'name') {
            await user.type(nameInput, 'Jane Doe');
        }
        if (missingField !== 'email') {
            await user.type(emailInput, 'jane@example.com');
        }
        if (missingField !== 'topic') {
            await user.type(topicInput, 'General');
        }
        if (missingField !== 'message') {
            await user.type(messageInput, 'Hello there');
        }

        const missingInput = fieldMap[missingField as keyof typeof fieldMap];
        expect(missingInput.checkValidity()).toBe(false);
        expect(missingInput.validity.valueMissing).toBe(true);

        const validInputs = [nameInput, emailInput, topicInput, messageInput].filter((input) => input !== missingInput);
        validInputs.forEach((input) => expect(input.checkValidity()).toBe(true));
    });
});
