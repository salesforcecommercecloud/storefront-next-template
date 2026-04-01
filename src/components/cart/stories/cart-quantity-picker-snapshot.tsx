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
import { vi, expect, test, describe, afterEach } from 'vitest';

type MockFormProps = React.PropsWithChildren<Record<string, unknown>>;
type MockLinkProps = React.PropsWithChildren<{ to?: string; href?: string; [key: string]: unknown }>;

const fetcherMock = {
    data: null,
    state: 'idle' as const,

    submit: () => {},
    Form: (props: MockFormProps) => <form {...props}>{props.children}</form>,
};

vi.mock('react-router', () => ({
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => fetcherMock,
    useFetchers: () => [],

    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle' as const,
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Form: (props: MockFormProps) => <form {...props}>{props.children}</form>,
    createMemoryRouter: vi.fn().mockImplementation(() => ({
        navigate: vi.fn(),
        state: { location: { pathname: '/', search: '', hash: '', state: null } },
    })),
    RouterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Link: (props: MockLinkProps) => {
        const { to, href, children, ...rest } = props ?? {};
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
}));
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...(actual as Record<string, unknown>),
        useFetcher: () => fetcherMock,
        useFetchers: () => [],

        useNavigate: () => () => {},
        useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
        useNavigation: () => ({
            state: 'idle' as const,
            location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
        }),
        createMemoryRouter: vi.fn().mockImplementation(() => ({
            navigate: vi.fn(),
            state: { location: { pathname: '/', search: '', hash: '', state: null } },
        })),
        Link: (props: MockLinkProps) => {
            const { to, href, children, ...rest } = props ?? {};
            return (
                <a href={to ?? href} {...rest}>
                    {children}
                </a>
            );
        },
    };
});

vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual('@salesforce/storefront-next-runtime/config');
    return {
        ...(actual as Record<string, unknown>),
        useConfig: () => ({
            pages: {
                cart: {
                    quantityUpdateDebounce: 750,
                },
            },
        }),
    };
});

import { composeStories } from '@storybook/react-vite';

import * as CartQuantityPickerStories from './cart-quantity-picker.stories';
import { render, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

const composed = composeStories(CartQuantityPickerStories);

afterEach(() => {
    cleanup();
});

describe('CartQuantityPicker stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const router = createMemoryRouter(
                [
                    {
                        path: '/',
                        element: (
                            <ConfigProvider config={mockConfig}>
                                <Story />
                            </ConfigProvider>
                        ),
                    },
                ],
                { initialEntries: ['/'] }
            );

            const { container } = render(<RouterProvider router={router} />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
