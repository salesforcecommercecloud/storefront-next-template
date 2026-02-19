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

'use client';

import { useState } from 'react';
import { type UseFormReturn, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCardNumber, formatExpiryDate } from '@/lib/form-utils';
import { detectCardType } from '@/lib/payment-utils';
import { getCardIcon } from '@/lib/card-icon-utils';

// Define the required field structure for credit card forms
interface CreditCardFormFields {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
    saveAsDefault?: boolean;
}

export interface CreditCardInputFieldsProps<TFormValues extends FieldValues & CreditCardFormFields> {
    /** React Hook Form instance */
    form: UseFormReturn<TFormValues>;
    /** Whether to auto-focus card number field (default: false) */
    autoFocus?: boolean;
    /** Whether to show the "save as default" checkbox (default: false) */
    showIsDefaultOption?: boolean;
    /** Label for the "save as default" checkbox */
    defaultOptionLabel?: string;
}

/**
 * Reusable credit card input fields component.
 * Renders card number, cardholder name, expiry date, and CVV fields with validation and formatting.
 * Used in both checkout and account payment methods flows.
 */
export function CreditCardInputFields<TFormValues extends FieldValues & CreditCardFormFields>({
    form,
    autoFocus = false,
    showIsDefaultOption = false,
    defaultOptionLabel,
}: CreditCardInputFieldsProps<TFormValues>) {
    const { t } = useTranslation('checkout');
    const [detectedCardType, setDetectedCardType] = useState<string>('');

    return (
        <>
            <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => {
                    const CardIcon = getCardIcon(detectedCardType || t('payment.unknownCardType'));
                    return (
                        <FormItem>
                            <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('payment.cardNumberLabel')}
                            </FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Input
                                            placeholder={t('payment.cardNumberPlaceholder')}
                                            autoComplete="cc-number"
                                            maxLength={23}
                                            autoFocus={autoFocus}
                                            {...field}
                                            onChange={(e) => {
                                                const formatted = formatCardNumber(e.target.value);
                                                field.onChange(formatted);
                                                const cardType = detectCardType(e.target.value);
                                                setDetectedCardType(cardType);
                                            }}
                                        />
                                    </div>
                                    {detectedCardType && detectedCardType !== t('payment.unknownCardType') && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                                            <CardIcon className="w-8 h-5 flex-shrink-0" />
                                            <span className="font-medium">{detectedCardType}</span>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    );
                }}
            />

            <FormField
                control={form.control}
                name="cardholderName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                            {t('payment.cardholderLabel')}
                        </FormLabel>
                        <FormControl>
                            <Input placeholder={t('payment.cardholderPlaceholder')} autoComplete="cc-name" {...field} />
                        </FormControl>
                        <FormMessage className="text-xl font-bold" />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('payment.expiryLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('payment.expiryPlaceholder')}
                                    autoComplete="cc-exp"
                                    maxLength={5}
                                    {...field}
                                    onChange={(e) => {
                                        const formatted = formatExpiryDate(e.target.value);
                                        field.onChange(formatted);
                                    }}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="cvv"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                {t('payment.cvvLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('payment.cvvPlaceholder')}
                                    autoComplete="cc-csc"
                                    maxLength={4}
                                    {...field}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        field.onChange(digits);
                                    }}
                                />
                            </FormControl>
                            <FormMessage className="text-xl font-bold" />
                        </FormItem>
                    )}
                />
            </div>

            {showIsDefaultOption && (
                <FormField
                    control={form.control}
                    name="saveAsDefault"
                    render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-1 space-y-0">
                            <FormControl>
                                <Checkbox id="save-default" checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel htmlFor="save-default" className="text-sm cursor-pointer">
                                {defaultOptionLabel ?? t('payment.saveAsDefault')}
                            </FormLabel>
                        </FormItem>
                    )}
                />
            )}
        </>
    );
}

export default CreditCardInputFields;
