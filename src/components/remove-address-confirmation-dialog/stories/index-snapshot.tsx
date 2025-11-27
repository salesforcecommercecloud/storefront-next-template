import { vi, expect, test, describe, afterEach } from 'vitest';
import type React from 'react';

// Mock react-router hooks
vi.mock('react-router', () => ({
    useRevalidator: () => ({
        revalidate: vi.fn(),
    }),
    useFetcher: () => ({
        data: null,
        state: 'idle',
        submit: vi.fn(),
        Form: (props: React.PropsWithChildren<Record<string, unknown>>) => <form {...props}>{props.children}</form>,
    }),
    useFetchers: () => [],
    useNavigate: () => vi.fn(),
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
}));

// Mock hooks
vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        state: 'idle',
        submit: vi.fn(),
    })),
}));

vi.mock('@/hooks/use-scapi-fetcher-effect', () => ({
    useScapiFetcherEffect: vi.fn(),
}));

// Mock toast
vi.mock('@/components/toast', () => ({
    useToast: vi.fn(() => ({
        addToast: vi.fn(),
    })),
}));

import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as RemoveAddressConfirmationDialogStories from './index.stories';
import { render, cleanup } from '@testing-library/react';
const composed = composeStories(RemoveAddressConfirmationDialogStories);

afterEach(() => {
    cleanup();
});

describe('RemoveAddressConfirmationDialog stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
