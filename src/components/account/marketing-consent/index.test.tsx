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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { ShopperConsents } from '@salesforce/storefront-next-runtime/scapi';
import { MarketingConsent } from './index';
import { getTranslation } from '@/lib/i18next';
import { ConfigWrapper } from '@/test-utils/config';

const { t } = getTranslation();

const mockUpdateSubscription = vi.fn();
const mockAddToast = vi.fn();
let capturedOnError: ((message: string) => void) | undefined;
vi.mock('@/hooks/use-update-marketing-consent', () => ({
    useUpdateMarketingConsent: vi.fn((onSuccess: () => void, onError?: (message: string) => void) => {
        capturedOnError = onError;
        return {
            updateSubscription: mockUpdateSubscription,
            isUpdating: false,
        };
    }),
}));
vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

function renderWithProviders(ui: React.ReactElement) {
    return render(<ConfigWrapper>{ui}</ConfigWrapper>);
}

const subscriptionsFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'Sale',
            channels: ['email'],
            title: 'Sale',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [{ channel: 'email', contactPointValue: 'user@example.com', status: 'opt_out' }],
        },
        {
            subscriptionId: 'Newsletter',
            channels: ['email'],
            title: 'Newsletter',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [{ channel: 'email', contactPointValue: 'user@example.com', status: 'opt_in' }],
        },
    ],
};

/** Fixture with multiple channels (email + sms) and subtitle for coverage. */
const multiChannelFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'Promo',
            channels: ['sms', 'email'],
            title: 'Promotions',
            subtitle: 'Get offers and deals.',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [
                { channel: 'email', contactPointValue: 'u@ex.com', status: 'opt_in' },
                { channel: 'sms', contactPointValue: '+123', status: 'opt_out' },
            ],
        },
    ],
};

/** Subscription with no consentStatus (fallback to defaultStatus). */
const defaultStatusOnlyFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'Legal',
            channels: ['email'],
            title: 'Legal updates',
            consentType: 'legal',
            consentRequired: true,
            defaultStatus: 'opt_in',
            tags: [],
        },
    ],
};

/** Subscription with no title (fallback to subscriptionId in UI). */
const noTitleFixture: ShopperConsents.schemas['ConsentSubscriptionResponse'] = {
    data: [
        {
            subscriptionId: 'no-title-id',
            channels: ['email'],
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: [],
            consentStatus: [{ channel: 'email', contactPointValue: 'u@ex.com', status: 'opt_out' }],
        },
    ],
};

describe('MarketingConsent', () => {
    beforeEach(() => {
        mockUpdateSubscription.mockClear();
        mockAddToast.mockClear();
        capturedOnError = undefined;
    });

    test('renders card with title and Edit button', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        expect(screen.getByText(t('account:marketingConsent.title'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('account:marketingConsent.editA11y') })).toBeInTheDocument();
    });

    test('renders Edit button with correct type and aria-label', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const editButton = screen.getByRole('button', { name: t('account:marketingConsent.editA11y') });
        expect(editButton).toHaveAttribute('type', 'button');
        expect(editButton).toHaveAttribute('aria-label', t('account:marketingConsent.editA11y'));
    });

    test('renders disclaimer', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        expect(screen.getByText(t('account:marketingConsent.disclaimer'))).toBeInTheDocument();
    });

    test('renders card with data-section attribute for marketing consent', () => {
        const { container } = renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const card = container.querySelector('[data-section="marketing-consent"]');
        expect(card).toBeInTheDocument();
    });

    test('with subscriptions prop renders channel section and subscription titles', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        expect(screen.getByText('Sale')).toBeInTheDocument();
        expect(screen.getByText('Newsletter')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Email', level: 2 })).toBeInTheDocument();
    });

    test('with subscriptions prop renders switches with correct initial state from consentStatus', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength(2);
        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        const newsletterSwitch = screen.getByRole('switch', {
            name: new RegExp(`Newsletter.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(saleSwitch).toHaveAttribute('aria-checked', 'false');
        expect(newsletterSwitch).toHaveAttribute('aria-checked', 'true');
    });

    test('clicking switch calls updateSubscription with correct payload when contactPointValueByChannel provided', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(saleSwitch).toHaveAttribute('aria-checked', 'false');
        expect(saleSwitch).not.toBeDisabled();

        await user.click(saleSwitch);

        expect(mockUpdateSubscription).toHaveBeenCalledTimes(1);
        expect(mockUpdateSubscription).toHaveBeenCalledWith({
            subscriptionId: 'Sale',
            channel: 'email',
            contactPointValue: 'user@example.com',
            status: 'opt_in',
        });
    });

    test('switch is disabled when contactPointValueByChannel has no value for channel', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength(2);
        switches.forEach((sw) => expect(sw).toBeDisabled());
    });

    test('with subscriptions null does not render the card', () => {
        renderWithProviders(<MarketingConsent subscriptions={null} />);

        expect(screen.queryByText(t('account:marketingConsent.title'))).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    test('with empty data array does not render the card', () => {
        renderWithProviders(<MarketingConsent subscriptions={{ data: [] }} />);

        expect(screen.queryByText(t('account:marketingConsent.title'))).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    test('with multiple channels renders section per channel in API order', () => {
        renderWithProviders(<MarketingConsent subscriptions={multiChannelFixture} />);

        expect(screen.getByRole('heading', { name: 'Sms', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Email', level: 2 })).toBeInTheDocument();
        expect(screen.getAllByText('Promotions')).toHaveLength(2);
        expect(screen.getAllByText('Get offers and deals.')).toHaveLength(2);
    });

    test('with multiple channels renders correct status per channel', () => {
        renderWithProviders(<MarketingConsent subscriptions={multiChannelFixture} />);

        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength(2);
        const smsSwitch = screen.getByRole('switch', {
            name: new RegExp(`Promotions.*${t('account:marketingConsent.optedOut')}`),
        });
        const emailSwitch = screen.getByRole('switch', {
            name: new RegExp(`Promotions.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(smsSwitch).toHaveAttribute('aria-checked', 'false');
        expect(emailSwitch).toHaveAttribute('aria-checked', 'true');
    });

    test('uses defaultStatus when consentStatus is missing', () => {
        renderWithProviders(<MarketingConsent subscriptions={defaultStatusOnlyFixture} />);

        const sw = screen.getByRole('switch', { name: new RegExp(`Legal.*${t('account:marketingConsent.optedIn')}`) });
        expect(sw).toHaveAttribute('aria-checked', 'true');
    });

    test('renders subscription list when data provided', () => {
        renderWithProviders(<MarketingConsent subscriptions={subscriptionsFixture} />);

        const lists = screen.getAllByRole('list');
        expect(lists).toHaveLength(1);
    });

    test('when subscription has no title uses subscriptionId for switch label', () => {
        renderWithProviders(<MarketingConsent subscriptions={noTitleFixture} />);

        const sw = screen.getByRole('switch', {
            name: new RegExp(`no-title-id.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(sw).toHaveAttribute('aria-checked', 'false');
    });

    test('when opt-in fails, switch reverts back to opt-out', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        const saleSwitch = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(saleSwitch).toHaveAttribute('aria-checked', 'false');

        await user.click(saleSwitch);
        expect(saleSwitch).toHaveAttribute('aria-checked', 'true');

        act(() => {
            capturedOnError?.('API error');
        });
        expect(mockAddToast).toHaveBeenCalledWith(t('account:marketingConsent.updateError'), 'error');
        const saleSwitchAfterRevert = screen.getByRole('switch', {
            name: new RegExp(`Sale.*${t('account:marketingConsent.optedOut')}`),
        });
        expect(saleSwitchAfterRevert).toHaveAttribute('aria-checked', 'false');
    });

    test('when opt-out fails, switch reverts back to opt-in', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <MarketingConsent
                subscriptions={subscriptionsFixture}
                contactPointValueByChannel={{ email: 'user@example.com' }}
            />
        );

        const newsletterSwitch = screen.getByRole('switch', {
            name: new RegExp(`Newsletter.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(newsletterSwitch).toHaveAttribute('aria-checked', 'true');

        await user.click(newsletterSwitch);
        expect(newsletterSwitch).toHaveAttribute('aria-checked', 'false');

        act(() => {
            capturedOnError?.('API error');
        });
        expect(mockAddToast).toHaveBeenCalledWith(t('account:marketingConsent.updateError'), 'error');
        const newsletterSwitchAfterRevert = screen.getByRole('switch', {
            name: new RegExp(`Newsletter.*${t('account:marketingConsent.optedIn')}`),
        });
        expect(newsletterSwitchAfterRevert).toHaveAttribute('aria-checked', 'true');
    });
});
