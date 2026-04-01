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
import { composeStories } from '@storybook/react-vite';
import * as CarouselStories from './carousel.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(CarouselStories);

afterEach(() => {
    cleanup();
});

describe('ProductCarousel stories snapshot', () => {
    // Mock the necessary react-router hooks
    vi.mock('react-router', async (importOriginal) => {
        const actual = await importOriginal<typeof import('react-router')>();
        return {
            ...actual,
            useNavigate: () => vi.fn(),
            useLocation: () => ({
                pathname: '/',
                search: '',
                hash: '',
                state: null,
                key: 'default',
            }),
            useResolvedPath: () => ({ pathname: '/', search: '', hash: '' }),
            useHref: () => '/',
            useSearchParams: () => [new URLSearchParams(), vi.fn()],
            // useFetcher is required by WishlistButton (useWishlist) and QuickAddButton (CartItemModal)
            useFetcher: () => ({
                state: 'idle',
                data: undefined,
                errors: undefined,
                submit: vi.fn(),
                load: vi.fn(),
                Form: (props: any) => <form {...props} />,
                formMethod: undefined,
                formAction: undefined,
                formData: undefined,
                formEncType: undefined,
                json: undefined,
                text: undefined,
            }),
            Link: (props: any) => (
                <a href={props.to} {...props}>
                    {props.children}
                </a>
            ),
            NavLink: (props: any) => (
                <a href={props.to} {...props}>
                    {props.children}
                </a>
            ),
        };
    });

    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
