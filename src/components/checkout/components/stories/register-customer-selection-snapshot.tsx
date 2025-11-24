import { expect, test, describe, afterEach } from 'vitest';

import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as RegisterCustomerSelectionStories from './register-customer-selection.stories';
import { render, cleanup } from '@testing-library/react';

const composed = composeStories(RegisterCustomerSelectionStories);

afterEach(() => {
    cleanup();
});

describe('RegisterCustomerSelection stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
