/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { useCallback, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { useStoreLocatorForm } from '@/extensions/store-locator/hooks/use-store-locator-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SelectNative } from '@/components/ui/select-native';
import { TextSeparator } from './text-separator';

/**
 * StoreLocatorForm
 *
 * Controlled form for searching stores either by country/postal code or by using
 * the shopper's current device location. Backed by the store locator state store.
 *
 * @returns ReactElement
 *
 * @example
 * <StoreLocatorForm />
 */
export default function StoreLocatorForm(): ReactElement {
    const { t } = useTranslation('extStoreLocator');
    const config = useStoreLocator((s) => s.config);
    const setDeviceCoordinates = useStoreLocator((s) => s.setDeviceCoordinates);
    const setGeoError = useStoreLocator((s) => s.setGeoError);
    const countryOptions = useStoreLocator((s) => s.config.supportedCountries);

    const { form, onSubmit } = useStoreLocatorForm();

    const onUseMyLocation = useCallback(() => {
        if (typeof window !== 'undefined' && window.navigator?.geolocation?.getCurrentPosition) {
            // Clear any previous permission error before attempting again
            setGeoError(false);
            window.navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setDeviceCoordinates({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                },
                (error) => {
                    // eslint-disable-next-line no-console
                    console.warn('geolocation error', error);
                    setGeoError(true);
                },
                { timeout: config.geoTimeout }
            );
        }
    }, [setDeviceCoordinates, setGeoError, config.geoTimeout]);

    return (
        <Form {...form}>
            <form
                onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                aria-label={t('storeLocator.form.searchFormAriaLabel')}>
                <div className="flex flex-col gap-3">
                    {countryOptions.length > 0 && (
                        <FormField
                            control={form.control}
                            name="countryCode"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-1">
                                    <FormLabel className="sr-only">{t('storeLocator.form.countryLabel')}</FormLabel>
                                    <FormControl>
                                        <SelectNative
                                            aria-label={t('storeLocator.form.countryLabel')}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}>
                                            <option value="" disabled>
                                                {t('storeLocator.form.selectCountry')}
                                            </option>
                                            {countryOptions.map((c) => (
                                                <option key={c.countryCode} value={c.countryCode}>
                                                    {c.countryName}
                                                </option>
                                            ))}
                                        </SelectNative>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="flex gap-2 items-end">
                        <FormField
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                                <FormItem className="flex flex-1 flex-col gap-1">
                                    <FormLabel className="sr-only">{t('storeLocator.form.postalCodeLabel')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            aria-label={t('storeLocator.form.postalCodeLabel')}
                                            placeholder={t('storeLocator.form.postalCodePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" aria-label={t('storeLocator.form.findButton')} className="h-9 px-5">
                            {t('storeLocator.form.findButton')}
                        </Button>
                    </div>

                    <TextSeparator text={t('storeLocator.form.or')} />

                    <Button
                        type="button"
                        onClick={onUseMyLocation}
                        aria-label={t('storeLocator.form.useMyLocationButton')}
                        className="w-full">
                        {t('storeLocator.form.useMyLocationButton')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
