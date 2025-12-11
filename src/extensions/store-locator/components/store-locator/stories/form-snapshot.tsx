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
    useInRouterContext: () => false,
    createMemoryRouter: vi.fn((routes) => ({
        routes: routes || [],
    })),
    RouterProvider: ({
        router,
        children,
    }: {
        router?: { routes?: Array<{ element?: React.ReactNode }> };
        children?: React.ReactNode;
    }) => {
        // Find the route with an element (usually the catch-all route at index 1)
        // If no route element found, render children as fallback (for test scenarios)
        const routeWithElement = router?.routes?.find((route) => {
            const elem = route.element;
            return elem && (typeof elem !== 'object' || !('then' in (elem as object)));
        });
        const element = routeWithElement?.element;
        // In test mocks, element is always a ReactElement, not a Promise
        if (element && (typeof element !== 'object' || !('then' in (element as object)))) {
            return <>{element as React.ReactElement}</>;
        }
        return <>{children}</>;
    },
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
        const resolveObj = resolve as any;
        const hasValue = resolveObj && typeof resolveObj === 'object' && '_value' in resolveObj;
        if (hasValue) {
            return <>{children(resolveObj._value)}</>;
        }
        return <>{children([])}</>;
    },
    useRevalidator: () => ({
        revalidate: () => Promise.resolve(),
    }),
}));

import { composeStories } from '@storybook/react-vite';
import * as FormStories from './form.stories';
import { render, cleanup } from '@testing-library/react';
import { StoryTestWrapper } from '../../../../../../.storybook/test-wrapper';

const composed = composeStories(FormStories);

afterEach(() => {
    cleanup();
});

describe('StoreLocatorForm stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        // Skip interaction test stories from snapshots
        if (Story?.parameters?.snapshot === false || /interactiontests?/i.test(storyName)) continue;

        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(
                <StoryTestWrapper>
                    <Story />
                </StoryTestWrapper>
            );
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
