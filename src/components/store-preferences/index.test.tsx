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
import { describe, test, expect } from 'vitest';
import StorePreferences from '.';

describe('StorePreferences', () => {
    const renderStorePreferences = () => {
        return render(<StorePreferences />);
    };

    describe('Page Content', () => {
        test('renders Store Preferences title', () => {
            renderStorePreferences();
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Store Preferences');
        });

        test('renders Store Preferences subtitle', () => {
            renderStorePreferences();
            expect(
                screen.getByText('Manage your preferred store locations and pickup preferences')
            ).toBeInTheDocument();
        });

        test('renders Preferred Store for Pickup section heading', () => {
            renderStorePreferences();
            expect(screen.getByText('Preferred Store for Pickup')).toBeInTheDocument();
        });

        test('renders preferred store description', () => {
            renderStorePreferences();
            expect(screen.getByText('Select your preferred store for in-store pickup orders')).toBeInTheDocument();
        });

        test('renders Change store button', () => {
            renderStorePreferences();
            expect(screen.getByRole('button', { name: 'Change store' })).toBeInTheDocument();
        });

        test('renders default store name', () => {
            renderStorePreferences();
            expect(screen.getByText('Salesforce Foundations - San Francisco')).toBeInTheDocument();
        });

        test('renders default store address', () => {
            renderStorePreferences();
            expect(screen.getByText('415 Mission Street, San Francisco, CA 94105')).toBeInTheDocument();
        });

        test('renders default store hours', () => {
            renderStorePreferences();
            expect(screen.getByText('Open today: 10:00 AM - 8:00 PM')).toBeInTheDocument();
        });

        test('renders Pickup Preferences section heading', () => {
            renderStorePreferences();
            expect(screen.getByText('Pickup Preferences')).toBeInTheDocument();
        });

        test('renders Pickup Preferences description', () => {
            renderStorePreferences();
            expect(screen.getByText('Manage your pickup notification and store preferences')).toBeInTheDocument();
        });

        test('renders Edit button in Pickup Preferences', () => {
            renderStorePreferences();
            expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
        });

        test('renders all three pickup preference toggles', () => {
            renderStorePreferences();
            expect(screen.getByText('Auto-select preferred store')).toBeInTheDocument();
            expect(screen.getByText('Pickup notifications')).toBeInTheDocument();
            expect(screen.getByText('Store events & promotions')).toBeInTheDocument();
        });
    });
});
