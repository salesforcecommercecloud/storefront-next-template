import { vi, expect, test, describe, afterEach } from 'vitest';

// Mock PayPal SDK button hook
vi.mock('@/hooks/use-paypal-sdk-button', () => ({
    usePayPalSDKButton: vi.fn(),
}));

import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as PayPalSDKButtonStories from './paypal-sdk-button.stories';

import { render, cleanup } from '@testing-library/react';
const composed = composeStories(PayPalSDKButtonStories);

afterEach(() => {
    cleanup();
});

describe('PayPalSDKButton stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
