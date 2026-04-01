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
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type LinkProps =
    | (AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string; href?: string; children?: ReactNode })
    | null;

vi.mock('react-router', () => ({
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => ({
        data: null,
        state: 'idle',
        submit: vi.fn(),
    }),
    useFetchers: () => [],
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useInRouterContext: () => false,
    createMemoryRouter: vi.fn().mockImplementation(() => ({
        navigate: vi.fn(),
        state: { location: { pathname: '/', search: '', hash: '', state: null } },
    })),
    RouterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    NavLink: ({
        to,
        children,
        className,
        ...rest
    }: LinkProps & { className?: string | ((props: { isActive: boolean }) => string) }) => {
        const {
            to: toProp,
            href,
            children: linkChildren,
            ...linkRest
        } = (rest ?? {}) as AnchorHTMLAttributes<HTMLAnchorElement> & {
            to?: string;
            href?: string;
            children?: ReactNode;
        };
        const hrefValue = to ?? toProp ?? href ?? '#';

        const resolvedClassName =
            typeof className === 'function' ? className({ isActive: hrefValue === '/' }) : className;
        return (
            <a href={hrefValue} className={resolvedClassName} {...linkRest}>
                {linkChildren ?? children}
            </a>
        );
    },
    Link: (props: LinkProps) => {
        const { to, href, children, ...rest } = (props ?? {}) as AnchorHTMLAttributes<HTMLAnchorElement> & {
            to?: string;
            href?: string;
            children?: ReactNode;
        };
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
}));

vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual('@salesforce/storefront-next-runtime/config');
    return {
        ...actual,
        useConfig: () => ({
            commerce: {
                api: {
                    organizationId: 'test-org',
                },
            },
        }),
    };
});

import { composeStories } from '@storybook/react-vite';

import * as ImplStories from './impl.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(ImplStories);

afterEach(() => {
    cleanup();
});

describe('CategoryNavigationMenu (impl) stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        if (Story?.parameters?.snapshot === false || /interactiontests?/i.test(storyName)) continue;
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
