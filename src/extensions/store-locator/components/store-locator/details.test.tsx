import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { getTranslation } from '@/lib/i18next';
import StoreDetails from './details';

const { t } = getTranslation();

const store: ShopperStores.schemas['Store'] = {
    id: 's1',
    name: 'Downtown Store',
    address1: '1 Market St',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94105',
    distance: 1.2345,
    phone: '555-1234',
    c_customerServiceEmail: 'help@example.com',
    storeHours: '<div>9-5</div>',
};

describe('StoreDetails', () => {
    test('renders basic info and optional details', async () => {
        render(<StoreDetails store={store} distanceUnit="mi" />);

        expect(screen.getByText('Downtown Store')).toBeInTheDocument();
        expect(screen.getByText('1 Market St')).toBeInTheDocument();
        expect(screen.getByText('San Francisco, CA 94105')).toBeInTheDocument();

        const distanceText = t('extStoreLocator:storeLocator.details.distanceAway', {
            distance: store.distance?.toFixed(2) ?? '0.00',
            unit: 'mi',
        });
        expect(screen.getByText(distanceText)).toBeInTheDocument();

        // Expand accordion to reveal phone, email, and hours content
        const user = userEvent.setup();
        await user.click(
            screen.getByRole('button', { name: t('extStoreLocator:storeLocator.details.storeDetailsTitle') })
        );

        expect(await screen.findByText(t('extStoreLocator:storeLocator.details.phoneLabel'))).toBeInTheDocument();
        expect(screen.getByText('555-1234')).toBeInTheDocument();
        expect(screen.getByText(t('extStoreLocator:storeLocator.details.emailLabel'))).toBeInTheDocument();
        expect(screen.getByText('help@example.com')).toBeInTheDocument();
        expect(screen.getByText(t('extStoreLocator:storeLocator.details.storeHoursTitle'))).toBeInTheDocument();
    });

    test('renders compact address with store name inline', () => {
        render(<StoreDetails store={store} compactAddress={true} />);

        expect(screen.getByText('Downtown Store -')).toBeInTheDocument();
    });
});
