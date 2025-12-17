import { vi, expect, test, describe, afterEach } from 'vitest';
import { composeStories } from '@storybook/react-vite';

import * as LoadingStories from './index.stories';
import { render, cleanup } from '@testing-library/react';

const fetcherMock = {
    data: null,
    state: 'idle',

    submit: () => {
        return null;
    },
    Form: (props: React.FormHTMLAttributes<HTMLFormElement> & { children?: React.ReactNode }) => (
        <form {...props}>{props.children}</form>
    ),
};

vi.mock('react-router', () => ({
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => fetcherMock,
    useFetchers: () => [],

    useNavigate: () => () => {
        return null;
    },
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: (
        props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
            to?: string;
            href?: string;
            children?: React.ReactNode;
        }
    ) => {
        const { to, href, children, ...rest } = props ?? {};
        return (
            <a href={to ?? href} {...rest}>
                {children}
            </a>
        );
    },
}));
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useFetcher: () => fetcherMock,
        useFetchers: () => [],

        useNavigate: () => () => {
            return null;
        },
        useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
        useNavigation: () => ({
            state: 'idle',
            location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
        }),
        Link: (
            props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
                to?: string;
                href?: string;
                children?: React.ReactNode;
            }
        ) => {
            const { to, href, children, ...rest } = props ?? {};
            return (
                <a href={to ?? href} {...rest}>
                    {children}
                </a>
            );
        },
    };
});
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: () => {
            return null;
        },
    }),
}));

const composed = composeStories(LoadingStories);

afterEach(() => {
    cleanup();
});

describe('Loading stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
