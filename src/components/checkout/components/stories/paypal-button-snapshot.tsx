import { vi, expect, test, describe, afterEach } from 'vitest';

// Mock PayPal SDK button hook
vi.mock('@/hooks/use-paypal-sdk-button', () => ({
    usePayPalSDKButton: vi.fn(),
}));

import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as PayPalButtonStories from './paypal-button.stories';

import { render, cleanup } from '@testing-library/react';
const composed = composeStories(PayPalButtonStories);

afterEach(() => {
    cleanup();
});

describe('PayPalButton stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
