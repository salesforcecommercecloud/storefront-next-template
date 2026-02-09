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
import PreferredStore from '.';

describe('PreferredStore', () => {
    const renderPreferredStore = () => {
        return render(<PreferredStore />);
    };

    describe('Section Content', () => {
        test('renders Preferred Store for Pickup heading', () => {
            renderPreferredStore();
            expect(screen.getByText('Preferred Store for Pickup')).toBeInTheDocument();
        });

        test('renders preferred store description', () => {
            renderPreferredStore();
            expect(screen.getByText('Select your preferred store for in-store pickup orders')).toBeInTheDocument();
        });

        test('renders Change store button', () => {
            renderPreferredStore();
            expect(screen.getByRole('button', { name: 'Change store' })).toBeInTheDocument();
        });

        test('renders default store name', () => {
            renderPreferredStore();
            expect(screen.getByText('Salesforce Foundations - San Francisco')).toBeInTheDocument();
        });

        test('renders default store address', () => {
            renderPreferredStore();
            expect(screen.getByText('415 Mission Street, San Francisco, CA 94105')).toBeInTheDocument();
        });

        test('renders default store hours', () => {
            renderPreferredStore();
            expect(screen.getByText('Open today: 10:00 AM - 8:00 PM')).toBeInTheDocument();
        });
    });
});
