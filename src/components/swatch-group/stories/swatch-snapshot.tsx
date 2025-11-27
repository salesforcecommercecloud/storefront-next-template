import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as SwatchStories from './swatch.stories';
import { expect, test, describe, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('react-router', () => ({
    NavLink: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={to} {...props}>
            {children}
        </a>
    ),
}));

const composed = composeStories(SwatchStories);

afterEach(() => {
    cleanup();
});

describe('Swatch stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
