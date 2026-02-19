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

import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCardIcon } from '@/lib/card-icon-utils';
import { getCardTypeDisplay } from '@/lib/payment-utils';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { PaymentMethod } from './payment-method-card';

export interface RemovePaymentMethodDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentMethod: PaymentMethod | null;
    onConfirm: () => void;
}

/**
 * Remove payment method confirmation dialog with two-step confirmation
 */
export function RemovePaymentMethodDialog({
    open,
    onOpenChange,
    paymentMethod,
    onConfirm,
}: RemovePaymentMethodDialogProps): ReactElement {
    const { t } = useTranslation('account');
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);

    const handleClose = () => {
        setShowFinalConfirm(false);
        onOpenChange(false);
    };

    const handleFirstRemove = () => {
        setShowFinalConfirm(true);
    };

    const handleFinalRemove = () => {
        setShowFinalConfirm(false);
        onConfirm();
    };

    const handleBackToFirst = () => {
        setShowFinalConfirm(false);
    };

    if (!paymentMethod) return null;

    // Use lib utility to normalize card type
    const displayName = getCardTypeDisplay({
        paymentCard: { cardType: paymentMethod.type },
    } as ShopperBasketsV2.schemas['OrderPaymentInstrument']);
    const CardIcon = getCardIcon(displayName);

    return (
        <>
            {/* First Confirmation Dialog */}
            <Dialog open={open && !showFinalConfirm} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl">{t('paymentMethods.removePaymentMethod')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('paymentMethods.removeConfirmation')}</p>

                        <Card className="border-border py-0">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">{t('paymentMethods.paymentMethod')}</span>
                                    <div className="flex items-center" aria-hidden="true">
                                        <CardIcon width={40} height={32} className="max-w-[40px] max-h-[32px]" />
                                    </div>
                                </div>
                                <p className="text-base font-semibold mb-1">
                                    {displayName} **** {paymentMethod.last4}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {paymentMethod.expiryMonth}/{paymentMethod.expiryYear} |{' '}
                                    {paymentMethod.cardholderName}
                                </p>
                                {paymentMethod.isDefault && (
                                    <div className="mt-2">
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded">
                                            {t('paymentMethods.default')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {paymentMethod.isDefault && (
                            <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{t('paymentMethods.defaultRemovalWarning')}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={handleClose}>
                            {t('paymentMethods.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleFirstRemove}>
                            {t('paymentMethods.remove')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Final Confirmation Dialog */}
            <Dialog open={showFinalConfirm} onOpenChange={handleBackToFirst}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl">{t('paymentMethods.removePaymentMethod')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('paymentMethods.removeConfirmation')}</p>

                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-base font-semibold mb-1">
                                {displayName} **** {paymentMethod.last4}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {paymentMethod.expiryMonth}/{paymentMethod.expiryYear} | {paymentMethod.cardholderName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={handleBackToFirst}>
                            {t('paymentMethods.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleFinalRemove}>
                            {t('paymentMethods.remove')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
