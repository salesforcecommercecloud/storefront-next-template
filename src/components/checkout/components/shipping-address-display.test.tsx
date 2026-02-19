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
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShippingAddressDisplay, type ShippingAddressDisplayProps } from './shipping-address-display';

const defaultNotProvidedText = 'Shipping address not provided yet';

function renderDisplay(props: Partial<ShippingAddressDisplayProps> = {}) {
    return render(
        <ShippingAddressDisplay notProvidedText={defaultNotProvidedText} {...(props as ShippingAddressDisplayProps)} />
    );
}

/** Full address (has countryCode so isAddressEmpty returns false) */
const fullAddress = {
    firstName: 'Jane',
    lastName: 'Doe',
    address1: '123 Main St',
    address2: 'Apt 4',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94102',
    phone: '555-123-4567',
    countryCode: 'US',
};

const emptyAddressFields = {
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    stateCode: '',
    postalCode: '',
    phone: '',
    countryCode: '',
};

describe('ShippingAddressDisplay', () => {
    describe('when address is empty or missing', () => {
        test.each<{ address: ShippingAddressDisplayProps['address']; label: string }>([
            { address: null, label: 'null' },
            { address: undefined, label: 'undefined' },
            { address: {}, label: 'empty object' },
            { address: emptyAddressFields, label: 'all fields empty' },
        ])('shows notProvidedText for $label', ({ address }) => {
            renderDisplay({ address, notProvidedText: 'Not provided' });
            expect(screen.getByText('Not provided')).toBeInTheDocument();
        });

        test('renders wrapper with empty content when address is null and notProvidedText is omitted', () => {
            const { container } = render(<ShippingAddressDisplay address={null} />);
            const wrapper = container.querySelector('.space-y-2');
            expect(wrapper).toBeInTheDocument();
            expect(wrapper?.textContent).toBe('');
        });

        test('renders wrapper with notProvidedText when address is null', () => {
            const { container } = renderDisplay({ address: null, notProvidedText: 'N/A' });
            expect(container.querySelector('.space-y-2')).toBeInTheDocument();
            expect(screen.getByText('N/A')).toBeInTheDocument();
        });
    });

    describe('when address is present', () => {
        test('renders full address with name, address lines, city/state/postal, and phone', () => {
            const { container } = renderDisplay({ address: fullAddress });

            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
            expect(screen.getByText('123 Main St')).toBeInTheDocument();
            expect(screen.getByText('Apt 4')).toBeInTheDocument();
            expect(screen.getByText(/San Francisco,\s*CA\s*94102/)).toBeInTheDocument();
            expect(screen.getByText('555-123-4567')).toBeInTheDocument();
            expect(container.querySelectorAll('[class*="text-muted-foreground"]').length).toBeGreaterThan(0);
            expect(container.querySelector('.space-y-2')).toBeInTheDocument();
        });

        test('renders only present fields for minimal address', () => {
            renderDisplay({ address: { firstName: 'Bob', address1: '1 Main St' } });

            expect(screen.getByText(/Bob/)).toBeInTheDocument();
            expect(screen.queryByText('123 Main St')).not.toBeInTheDocument();
        });
    });

    describe('optional address2', () => {
        test('does not render address2 line when address2 is missing', () => {
            const { address2, ...noAddress2 } = fullAddress;
            void address2;
            renderDisplay({ address: noAddress2 });

            expect(screen.getByText('123 Main St')).toBeInTheDocument();
            expect(screen.queryByText('Apt 4')).not.toBeInTheDocument();
        });

        test('does not render address2 line when address2 is empty string', () => {
            renderDisplay({ address: { ...fullAddress, address2: '' } });

            expect(screen.getByText('123 Main St')).toBeInTheDocument();
            expect(screen.queryByText('Apt 4')).not.toBeInTheDocument();
        });

        test('renders address2 when present', () => {
            renderDisplay({ address: fullAddress });
            expect(screen.getByText('Apt 4')).toBeInTheDocument();
        });
    });

    describe('optional stateCode', () => {
        test('renders city and postal without state when stateCode is missing', () => {
            const { stateCode, ...noState } = fullAddress;
            void stateCode;
            renderDisplay({ address: noState });

            expect(screen.getByText(/San Francisco\s*94102/)).toBeInTheDocument();
        });

        test('renders city, state, and postal when stateCode is present', () => {
            renderDisplay({ address: fullAddress });
            expect(screen.getByText(/San Francisco,\s*CA\s*94102/)).toBeInTheDocument();
        });
    });

    describe('displayPhone override', () => {
        test('shows address.phone when displayPhone is not provided', () => {
            renderDisplay({ address: fullAddress });
            expect(screen.getByText('555-123-4567')).toBeInTheDocument();
        });

        test('shows displayPhone instead of address.phone when both provided', () => {
            renderDisplay({ address: fullAddress, displayPhone: '999-888-7777' });

            expect(screen.getByText('999-888-7777')).toBeInTheDocument();
            expect(screen.queryByText('555-123-4567')).not.toBeInTheDocument();
        });

        test('shows displayPhone when address.phone is empty', () => {
            renderDisplay({
                address: { ...fullAddress, phone: '' },
                displayPhone: '111-222-3333',
            });
            expect(screen.getByText('111-222-3333')).toBeInTheDocument();
        });

        test('does not show phone line when address has no phone and no displayPhone', () => {
            const { phone, ...noPhone } = fullAddress;
            void phone;
            renderDisplay({ address: noPhone });

            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
            expect(screen.queryByText('555-123-4567')).not.toBeInTheDocument();
        });
    });
});
