import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTranslation } from '@/lib/i18next';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

const { t } = getTranslation();

// Mock the lazy-loaded store locator sheet
vi.mock('@/extensions/store-locator/components/header/store-locator-sheet', () => ({
    default: ({
        children,
        open,
        onOpenChange,
    }: {
        children: any;
        open: boolean;
        onOpenChange: (open: boolean) => void;
    }) => (
        <div data-testid="mock-store-locator-sheet" data-open={open}>
            {children}
            <button onClick={() => onOpenChange(false)}>Mock Close</button>
        </div>
    ),
}));

import StoreLocatorBadge from '@/extensions/store-locator/components/header/store-locator-badge';

describe('StoreLocatorBadge', () => {
    test('renders initial trigger button', () => {
        render(
            <AllProvidersWrapper>
                <StoreLocatorBadge />
            </AllProvidersWrapper>
        );

        expect(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.trigger.ariaLabel') })
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('button', { name: t('extStoreLocator:storeLocator.trigger.openAriaLabel') })
        ).not.toBeInTheDocument();
    });

    test('shows open button and sheet after clicking trigger', async () => {
        render(
            <AllProvidersWrapper>
                <StoreLocatorBadge />
            </AllProvidersWrapper>
        );

        await userEvent.click(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.trigger.ariaLabel') })
        );

        const openBtn = await screen.findByRole('button', {
            name: t('extStoreLocator:storeLocator.trigger.openAriaLabel'),
        });

        expect(openBtn).toBeInTheDocument();
        const sheet = screen.getByTestId('mock-store-locator-sheet');
        expect(sheet).toBeInTheDocument();
        expect(sheet).toHaveAttribute('data-open', 'true');
    });
});
