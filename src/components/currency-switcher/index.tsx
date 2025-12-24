'use client';

import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetcher } from 'react-router';
import { SelectNative } from '@/components/ui/select-native';
import { useConfig } from '@/config';
import { useCurrency } from '@/providers/currency';
import { useToast } from '@/components/toast';

/**
 * Currency Switcher Component
 *
 * Allows users to manually select a currency, which takes precedence over locale-based currency.
 * The selected currency is stored in a cookie and persists across sessions.
 *
 */
export default function CurrencySwitcher(): ReactElement {
    const id = useId();
    const { t } = useTranslation('currencySwitcher');
    const fetcher = useFetcher();
    const config = useConfig();
    const currentCurrency = useCurrency();
    const { addToast } = useToast();

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;

        // Validate: Check if currency is in supportedCurrencies
        if (!config.site.supportedCurrencies.includes(newCurrency)) {
            addToast(t('validation.unsupportedCurrency'), 'error');
            return;
        }

        const formData = new FormData();
        formData.append('currency', newCurrency);

        // Submit to server action - React Router will automatically revalidate loaders
        void fetcher.submit(formData, {
            method: 'POST',
            action: '/action/set-currency',
        });
    };

    return (
        <div>
            <SelectNative id={id} onChange={handleCurrencyChange} aria-label={t('ariaLabel')} value={currentCurrency}>
                {config.site.supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                        {t(`currencies.${currency}`, { defaultValue: currency })}
                    </option>
                ))}
            </SelectNative>
        </div>
    );
}
