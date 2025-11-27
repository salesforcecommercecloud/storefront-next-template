import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as RegionStories from './index.stories';
import { expect, test, describe, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
const composed = composeStories(RegionStories);

afterEach(() => {
    cleanup();
});

describe('Region stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
