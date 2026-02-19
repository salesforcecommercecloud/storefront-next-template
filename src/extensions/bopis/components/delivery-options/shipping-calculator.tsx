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

import { type ReactElement, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductContentAdapter } from '@/providers/product-content';
import type { ShippingEstimate } from '@/lib/adapters/product-content-data-types';

// US Postal Code validation (5 digits or 5+4 format)
const US_POSTAL_CODE_REGEX = /^\d{5}(-\d{4})?$/;

interface ShippingCalculatorProps {
    onCalculate: (zipCode: string, deliveryDays: number) => void;
    productId: string;
}

export default function ShippingCalculator({ onCalculate, productId }: ShippingCalculatorProps): ReactElement | null {
    const { t } = useTranslation('extBopis');
    const [inputValue, setInputValue] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [deliveryEstimate, setDeliveryEstimate] = useState<ShippingEstimate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [showInvalidZipError, setShowInvalidZipError] = useState(false);

    const adapter = useProductContentAdapter();

    // All hooks must be called before any conditional returns
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Early return after all hooks
    if (!adapter?.getShippingEstimates) {
        return null;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
        setInputValue(val);
        setShowResult(false);
        clearError();
        setShowInvalidZipError(false);
    };

    const isValidZip = US_POSTAL_CODE_REGEX.test(inputValue);

    const handleCalculate = async () => {
        if (!isValidZip) {
            setShowInvalidZipError(true);
            return;
        }

        if (!adapter?.getShippingEstimates) return;

        clearError();
        setShowResult(false);
        setIsLoading(true);

        try {
            const estimate = await adapter.getShippingEstimates(productId, inputValue);
            setDeliveryEstimate(estimate);
            onCalculate(inputValue, estimate.days);
            setShowResult(true);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 border border-muted-foreground/20 rounded-lg bg-card">
            <div className="space-y-3">
                <div>
                    <label htmlFor="delivery-zip-input" className="text-sm font-medium text-foreground">
                        {t('deliveryOptions.pickupOrDelivery.calculatorTitle')}
                    </label>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <input
                            id="delivery-zip-input"
                            inputMode="numeric"
                            maxLength={5}
                            placeholder={t('deliveryOptions.pickupOrDelivery.zipPlaceholder')}
                            aria-label={t('deliveryOptions.pickupOrDelivery.zipAriaLabel')}
                            aria-invalid={showInvalidZipError}
                            aria-describedby={
                                showResult
                                    ? 'delivery-result'
                                    : showInvalidZipError
                                      ? 'validation-error'
                                      : 'delivery-message'
                            }
                            className={cn(
                                'w-full px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2 bg-background',
                                showInvalidZipError
                                    ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                                    : 'border-muted-foreground/20 focus:border-ring focus:ring-ring'
                            )}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                        />
                    </div>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                        disabled={isLoading}
                        onClick={() => void handleCalculate()}
                        aria-label={t('deliveryOptions.pickupOrDelivery.calculateAriaLabel')}>
                        {isLoading
                            ? t('deliveryOptions.pickupOrDelivery.calculating')
                            : t('deliveryOptions.pickupOrDelivery.calculateButton')}
                    </button>
                </div>

                {showInvalidZipError && (
                    <p id="validation-error" className="text-xs text-destructive" role="alert">
                        {t('deliveryOptions.pickupOrDelivery.invalidZipCode')}
                    </p>
                )}

                {!showResult && !isLoading && !error && !showInvalidZipError && (
                    <p id="delivery-message" className="text-xs text-muted-foreground">
                        {t('deliveryOptions.pickupOrDelivery.calculatorInstructionMessage')}
                    </p>
                )}

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-destructive">
                                    {t('deliveryOptions.pickupOrDelivery.errorFetchingEstimates')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void handleCalculate()}
                                    className="text-sm text-destructive underline hover:no-underline mt-1">
                                    {t('deliveryOptions.pickupOrDelivery.retry')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showResult && !error && (
                    <div
                        id="delivery-result"
                        role="status"
                        aria-live="polite"
                        className="bg-success/10 border border-success/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm text-success">
                                    {t('deliveryOptions.pickupOrDelivery.estimatedDeliveryInDays', {
                                        days: deliveryEstimate?.days,
                                    })}
                                </p>
                                <p className="text-sm text-success flex items-center gap-1">
                                    <span>
                                        {t('deliveryOptions.pickupOrDelivery.shippingCost')}{' '}
                                        <span className="font-semibold">
                                            {deliveryEstimate && deliveryEstimate.cost > 0
                                                ? `$${deliveryEstimate.cost.toFixed(2)}`
                                                : t('deliveryOptions.pickupOrDelivery.free')}
                                        </span>
                                    </span>
                                    {deliveryEstimate && deliveryEstimate.cost === 0 && <Check className="w-4 h-4" />}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
