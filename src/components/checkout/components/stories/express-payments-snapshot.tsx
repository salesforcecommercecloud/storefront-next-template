import { vi, expect, test, describe, afterEach } from 'vitest';

// Mock PayPal SDK hook
vi.mock('@/hooks/use-paypal-sdk', () => ({
    usePayPalSDK: vi.fn(() => ({ isLoading: false, error: null })),
}));

// Mock PayPal and Venmo button components
vi.mock('../paypal-button', () => ({
    default: ({ onApprove, disabled }: { onApprove: () => void; disabled?: boolean }) => (
        <button
            data-testid="paypal-button"
            onClick={onApprove}
            disabled={disabled}
            className="w-full h-12 bg-[#0070ba] hover:bg-[#005ea6] text-background rounded flex items-center justify-center">
            PayPal
        </button>
    ),
}));

vi.mock('../venmo-button', () => ({
    default: ({ onApprove, disabled }: { onApprove: () => void; disabled?: boolean }) => (
        <button
            data-testid="venmo-button"
            onClick={onApprove}
            disabled={disabled}
            className="w-full h-12 bg-[#3D95CE] hover:bg-[#2d7fb8] text-background rounded flex items-center justify-center">
            Venmo
        </button>
    ),
}));

import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as ExpressPaymentsStories from './express-payments.stories';

import { render, cleanup } from '@testing-library/react';
const composed = composeStories(ExpressPaymentsStories);

afterEach(() => {
    cleanup();
});

describe('ExpressPayments stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, () => {
            const { container } = render(<Story />);
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
