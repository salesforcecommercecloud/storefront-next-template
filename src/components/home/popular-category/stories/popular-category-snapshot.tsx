import { vi, expect, test, describe, afterEach } from 'vitest';
import type React from 'react';

vi.mock('react-router', () => ({
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => ({
        data: null,
        state: 'idle',
        submit: () => {},
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
    Suspense: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
        <div>{fallback || children}</div>
    ),
    Await: ({ resolve, children }: { resolve: Promise<unknown>; children: (data: unknown) => React.ReactNode }) => {
        // For snapshot tests, we need to handle the promise synchronously
        const resolveObj = resolve as any;
        const hasValue = resolveObj && typeof resolveObj === 'object' && '_value' in resolveObj;
        if (hasValue) {
            return <>{children(resolveObj._value)}</>;
        }
        return <>{children([])}</>;
    },
}));

vi.mock('@/components/content-card', () => ({
    default: (props: Record<string, unknown>) => <div data-testid="content-card">{JSON.stringify(props)}</div>,
}));

import { composeStories } from '@storybook/react-vite';

import * as PopularCategoryStories from '../popular-category.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(PopularCategoryStories);

afterEach(() => {
    cleanup();
});

describe('PopularCategory stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        // Skip interaction test stories from snapshots
        if (Story?.parameters?.snapshot === false || /interactiontests?/i.test(storyName)) continue;

        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
