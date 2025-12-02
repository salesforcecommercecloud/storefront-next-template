/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import type { FormSearchParams } from '@/extensions/store-locator/stores/store-locator-store';

const createFormSchema = (t: TFunction) => {
    return z.object({
        countryCode: z.string().min(1, t('extStoreLocator:storeLocator.form.selectCountryValidation')),
        postalCode: z.string().min(1, t('extStoreLocator:storeLocator.form.postalCodeValidation')),
    });
};

/**
 * Hook to manage store locator form.
 * The form state is backed by the store locator store.
 *
 * @returns An object with `form` (react-hook-form methods) and `onSubmit` handler
 *
 * @example
 * const { form, onSubmit } = useStoreLocatorForm();
 * return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
 */
export function useStoreLocatorForm() {
    const { t } = useTranslation();
    const searchByForm = useStoreLocator((s) => s.searchByForm);
    const storeSearchParams = useStoreLocator((s) => s.searchParams);

    // Use searchParams or default empty values for form initialization
    const defaultValues = storeSearchParams || { countryCode: '', postalCode: '' };

    const formSchema = useMemo(() => createFormSchema(t), [t]);

    const form = useForm<FormSearchParams>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    // Reset form when store values change externally
    useEffect(() => {
        const newDefaults = storeSearchParams || { countryCode: '', postalCode: '' };
        form.reset(newDefaults);
    }, [storeSearchParams, form]);

    const onSubmit = useCallback(
        (data: FormSearchParams) => {
            searchByForm(data);
        },
        [searchByForm]
    );

    return {
        form,
        onSubmit,
    };
}
