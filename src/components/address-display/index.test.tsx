/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import AddressDisplay from './index';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

describe('AddressDisplay', () => {
    describe('when no address is provided', () => {
        test('user sees "No address provided" message', () => {
            render(<AddressDisplay address={null as never} />);

            expect(screen.getByText('No address provided')).toBeInTheDocument();
        });

        test('user does not see any address details', () => {
            render(<AddressDisplay address={null as never} />);

            // No name, address line, city, etc. should be visible
            expect(screen.queryByText(/123|Main St|New York/i)).not.toBeInTheDocument();
        });
    });

    describe('when complete address with all fields is provided', () => {
        const completeAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-1',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
            phone: '555-123-4567',
        };

        test('renders all the data properly', () => {
            render(<AddressDisplay address={completeAddress} />);

            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('123 Main Street')).toBeInTheDocument();
            expect(screen.getByText('Apt 4B')).toBeInTheDocument();
            expect(screen.getByText('New York, NY 10001')).toBeInTheDocument();
            expect(screen.getByText('US')).toBeInTheDocument();
            expect(screen.getByText('555-123-4567')).toBeInTheDocument();
        });
    });

    describe('when address has only required fields', () => {
        const minimalAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-2',
            countryCode: 'US',
            firstName: 'Jane',
            lastName: 'Smith',
            address1: '456 Oak Avenue',
            city: 'Seattle',
        };

        test('user sees name and primary address', () => {
            render(<AddressDisplay address={minimalAddress} />);

            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('456 Oak Avenue')).toBeInTheDocument();
        });

        test('user sees city without state or postal code', () => {
            render(<AddressDisplay address={minimalAddress} />);

            expect(screen.getByText('Seattle')).toBeInTheDocument();
        });

        test('user does not see address2 when not provided', () => {
            const { container } = render(<AddressDisplay address={minimalAddress} />);

            // Verify address2 text doesn't exist
            expect(container.textContent).not.toContain('Apt');
            expect(container.textContent).not.toContain('Suite');
        });

        test('user sees country code since it is a required field', () => {
            render(<AddressDisplay address={minimalAddress} />);

            expect(screen.getByText('US')).toBeInTheDocument();
        });

        test('user does not see phone when not provided', () => {
            render(<AddressDisplay address={minimalAddress} />);

            expect(screen.queryByText(/555|phone/i)).not.toBeInTheDocument();
        });
    });

    describe('when address has city with state but no postal code', () => {
        const addressWithState: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-3',
            countryCode: 'US',
            firstName: 'Bob',
            lastName: 'Johnson',
            address1: '789 Pine Road',
            city: 'Austin',
            stateCode: 'TX',
        };

        test('user sees city and state formatted together', () => {
            render(<AddressDisplay address={addressWithState} />);

            expect(screen.getByText('Austin, TX')).toBeInTheDocument();
        });

        test('user does not see extra space for missing postal code', () => {
            render(<AddressDisplay address={addressWithState} />);

            // Should be "Austin, TX" not "Austin, TX "
            const cityElement = screen.getByText('Austin, TX');
            expect(cityElement.textContent).toBe('Austin, TX');
        });
    });

    describe('when address has city with postal code but no state', () => {
        const addressWithPostal: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-4',
            countryCode: 'US',
            firstName: 'Alice',
            lastName: 'Williams',
            address1: '321 Elm Boulevard',
            city: 'Boston',
            postalCode: '02101',
        };

        test('user sees city and postal code formatted together', () => {
            render(<AddressDisplay address={addressWithPostal} />);

            expect(screen.getByText('Boston 02101')).toBeInTheDocument();
        });
    });

    describe('when address has all city fields', () => {
        const fullCityAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-5',
            countryCode: 'US',
            firstName: 'Charlie',
            lastName: 'Brown',
            address1: '555 Maple Lane',
            city: 'Chicago',
            stateCode: 'IL',
            postalCode: '60601',
        };

        test('user sees city, state, and postal code in correct format', () => {
            render(<AddressDisplay address={fullCityAddress} />);

            expect(screen.getByText('Chicago, IL 60601')).toBeInTheDocument();
        });
    });

    describe('when address has empty string values', () => {
        const addressWithEmptyStrings: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-6',
            firstName: 'Test',
            lastName: 'User',
            address1: '999 Test Street',
            address2: '',
            city: 'Portland',
            stateCode: '',
            postalCode: '',
            countryCode: '',
            phone: '',
        };

        test('user does not see empty optional fields', () => {
            const { container } = render(<AddressDisplay address={addressWithEmptyStrings} />);

            // Should show minimal version - name, address1, city only
            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('999 Test Street')).toBeInTheDocument();
            expect(screen.getByText('Portland')).toBeInTheDocument();

            // Should not have extra empty lines or commas
            const text = container.textContent || '';
            expect(text).not.toMatch(/,\s*$/); // No trailing commas
            expect(text).not.toMatch(/\s{3,}/); // No excessive whitespace
        });
    });

    describe('international addresses', () => {
        const ukAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-7',
            firstName: 'David',
            lastName: 'Taylor',
            address1: '10 Downing Street',
            city: 'London',
            postalCode: 'SW1A 2AA',
            countryCode: 'GB',
        };

        test('user sees UK address formatted correctly', () => {
            render(<AddressDisplay address={ukAddress} />);

            expect(screen.getByText('David Taylor')).toBeInTheDocument();
            expect(screen.getByText('10 Downing Street')).toBeInTheDocument();
            expect(screen.getByText('London SW1A 2AA')).toBeInTheDocument();
            expect(screen.getByText('GB')).toBeInTheDocument();
        });

        const canadianAddress: ShopperCustomers.schemas['CustomerAddress'] = {
            addressId: 'address-8',
            firstName: 'Sarah',
            lastName: 'Martin',
            address1: '24 Sussex Drive',
            city: 'Ottawa',
            stateCode: 'ON',
            postalCode: 'K1M 1M4',
            countryCode: 'CA',
            phone: '+1-613-555-0199',
        };

        test('user sees Canadian address with province and international phone', () => {
            render(<AddressDisplay address={canadianAddress} />);

            expect(screen.getByText('Sarah Martin')).toBeInTheDocument();
            expect(screen.getByText('Ottawa, ON K1M 1M4')).toBeInTheDocument();
            expect(screen.getByText('CA')).toBeInTheDocument();
            expect(screen.getByText('+1-613-555-0199')).toBeInTheDocument();
        });
    });
});
