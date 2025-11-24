import { vi, expect, test, describe, afterEach } from 'vitest';

type MockFormProps = React.PropsWithChildren<Record<string, unknown>>;
type MockLinkProps = React.PropsWithChildren<{ to?: string; href?: string; [key: string]: unknown }>;

const fetcherMock = {
    data: null,
    state: 'idle',
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    submit: () => {},
    Form: (props: MockFormProps) => <form {...props}>{props.children}</form>,
};

vi.mock('react-router', () => ({
    createContext: vi.fn().mockImplementation(() => ({})),
    useFetcher: () => fetcherMock,
    useFetchers: () => [],
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useNavigation: () => ({
        state: 'idle',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
    }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: (props: MockLinkProps) => {
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
        ...actual,
        useFetcher: () => fetcherMock,
        useFetchers: () => [],
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        useNavigate: () => () => {},
        useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
        useNavigation: () => ({
            state: 'idle',
            location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
        }),
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
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        addToast: () => {},
    }),
}));
vi.mock('@/providers/basket', () => ({
    useBasket: () => ({
        basket: null,
        isLoading: false,
    }),
}));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: () => ({
        customerProfile: {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
        },
        isLoading: false,
    }),
}));

import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as PaymentStories from './payment.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(PaymentStories);

afterEach(() => {
    cleanup();
});

describe('Payment stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
