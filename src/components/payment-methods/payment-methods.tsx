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
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentMethodCard, type PaymentMethod } from './payment-method-card';
import { RemovePaymentMethodDialog } from './remove-payment-method-dialog';
import { AddPaymentMethodDialog } from './add-payment-method-dialog';
import { useTranslation } from 'react-i18next';

// Mock data for testing
const mockPaymentMethods: PaymentMethod[] = [
    {
        id: '1',
        type: 'visa',
        last4: '4242',
        expiryMonth: '12',
        expiryYear: '2026',
        cardholderName: 'John Doe',
        isDefault: true,
    },
    {
        id: '2',
        type: 'mastercard',
        last4: '5555',
        expiryMonth: '12',
        expiryYear: '2026',
        cardholderName: 'John Doe',
        isDefault: false,
    },
];

export interface PaymentMethodsProps {
    customer: ShopperCustomers.schemas['Customer'] | null;
}

/**
 * Payment methods content component
 */
export function PaymentMethods({ customer }: PaymentMethodsProps): ReactElement {
    const { t } = useTranslation('account');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

    const hasPaymentMethods = mockPaymentMethods.length > 0;

    const handleAddClick = () => {
        setIsAddDialogOpen(true);
    };

    const handleAddSubmit = () => {
        // TODO: Implement actual payment method addition
        setIsAddDialogOpen(false);
    };

    const handleRemoveClick = (method: PaymentMethod) => {
        setSelectedPaymentMethod(method);
        setIsRemoveDialogOpen(true);
    };

    const handleRemoveDialogClose = () => {
        setIsRemoveDialogOpen(false);
        setSelectedPaymentMethod(null);
    };

    const handleRemoveConfirm = () => {
        // TODO: Implement actual payment method removal
        setIsRemoveDialogOpen(false);
        setSelectedPaymentMethod(null);
    };

    const handleSetDefault = (_method: PaymentMethod) => {
        // TODO: Implement set as default
    };

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <Card className="px-6 pt-6 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1" tabIndex={0}>
                        {t('navigation.paymentMethods')}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t('paymentMethods.pageSubtitle')}</p>
                </div>
            </Card>

            {/* Payment Methods Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between pb-6 border-b">
                    <div>
                        <h2 className="text-base font-semibold text-foreground mb-1">
                            {t('navigation.paymentMethods')}
                        </h2>
                        <p className="text-sm text-muted-foreground">{t('paymentMethods.subtitle')}</p>
                    </div>
                    <Button variant="outline" onClick={handleAddClick}>
                        {t('paymentMethods.addPaymentMethod')}
                    </Button>
                </div>

                <div className="pt-2">
                    {!hasPaymentMethods ? (
                        /* Empty State */
                        <div className="py-8 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-muted-foreground">
                                    <p className="text-lg font-medium">{t('paymentMethods.noSavedPaymentMethods')}</p>
                                    <p className="text-sm mt-1">{t('paymentMethods.empty')}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Payment Methods List */
                        <div className="space-y-6">
                            {mockPaymentMethods.map((method) => (
                                <PaymentMethodCard
                                    key={method.id}
                                    paymentMethod={method}
                                    onRemove={() => handleRemoveClick(method)}
                                    onSetDefault={() => handleSetDefault(method)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Add Payment Method Dialog */}
            <AddPaymentMethodDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSubmit={handleAddSubmit}
                addresses={customer?.addresses || []}
            />

            {/* Remove Payment Method Dialog */}
            <RemovePaymentMethodDialog
                open={isRemoveDialogOpen}
                onOpenChange={handleRemoveDialogClose}
                paymentMethod={selectedPaymentMethod}
                onConfirm={handleRemoveConfirm}
            />
        </div>
    );
}
