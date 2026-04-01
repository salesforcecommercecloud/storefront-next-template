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
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SiteProvider, useSite } from './site-context';
import type { Site } from '../config/types';

const mockSite: Site = {
    id: 'RefArchGlobal',
    defaultCurrency: 'GBP',
    defaultLocale: 'en-GB',
    supportedCurrencies: ['EUR', 'GBP'],
    supportedLocales: [
        { id: 'en-GB', preferredCurrency: 'GBP' },
        { id: 'de-DE', preferredCurrency: 'EUR' },
    ],
};

function TestConsumer() {
    const site = useSite();
    return <div data-testid="result">{JSON.stringify(site)}</div>;
}

describe('SiteProvider / useSite', () => {
    afterEach(cleanup);

    it('returns undefined when no provider is mounted', () => {
        const { getByTestId } = render(<TestConsumer />);
        expect(getByTestId('result').textContent).toBe('');
    });

    it('provides site to consumers', () => {
        const { getByTestId } = render(
            <SiteProvider value={mockSite}>
                <TestConsumer />
            </SiteProvider>
        );

        expect(JSON.parse(getByTestId('result').textContent)).toEqual(mockSite);
    });
});
