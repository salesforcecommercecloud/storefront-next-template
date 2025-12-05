import { vi, expect, test, describe, afterEach, beforeEach } from 'vitest';
import type React from 'react';

// Suppress Radix UI Dialog accessibility warnings (intentional for snapshot testing)
// eslint-disable-next-line no-console
const originalWarn = console.warn;
beforeEach(() => {
    // eslint-disable-next-line no-console
    console.warn = vi.fn((...args: unknown[]) => {
        const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ');
        // Suppress Dialog Description warnings
        if (message.includes('Missing `Description`') && message.includes('DialogContent')) {
            return;
        }
        originalWarn(...args);
    });
});

afterEach(() => {
    // eslint-disable-next-line no-console
    console.warn = originalWarn;
});

vi.mock('@/config', async () => {
    const actual = await vi.importActual('@/config');
    return {
        ...(actual as Record<string, unknown>),
        useConfig: () => ({
            pages: {
                cart: {
                    quantityUpdateDebounce: 500,
                    maxQuantityPerItem: 10,
                    removeAction: '/api/cart/remove',
                },
            },
        }),
    };
});

vi.mock('react-router', () => ({
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => ({
        data: null,
        state: 'idle',

        submit: () => {},

        load: () => {},
        Form: (props: React.PropsWithChildren<Record<string, unknown>>) => <form {...props}>{props.children}</form>,
    }),
    useFetchers: () => [],

    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: (props: React.PropsWithChildren<{ to?: string; href?: string; [key: string]: unknown }>) => {
        const { to, href, children, ...rest } = props ?? {};
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
    createMemoryRouter: vi.fn((routes) => ({ routes })),
    RouterProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

let mockBasketValue: unknown = undefined;

vi.mock('@/providers/basket', () => ({
    default: ({ children, value }: { children: React.ReactNode; value: unknown }) => {
        mockBasketValue = value;
        return <div>{children}</div>;
    },
    useBasket: () => mockBasketValue,
}));

import { composeStories } from '@storybook/react-vite';

import * as CartSheetStories from './cart-sheet.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(CartSheetStories);

afterEach(() => {
    cleanup();
});

describe('CartSheet stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        if (Story?.parameters?.snapshot === false || /interactiontests?/i.test(storyName)) continue;
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
