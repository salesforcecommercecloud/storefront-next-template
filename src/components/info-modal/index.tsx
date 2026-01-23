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

import { type ReactElement } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrency } from '@/providers/currency';
import type { InfoModalProps } from './types';

// Re-export types for convenience
export type { InfoModalData, InfoModalProps, PaymentSchedule, StepInfo, ModalLink } from './types';

// Import renderer components
import { PaymentScheduleModalContent } from './renderers/payment-schedule-modal-content';
import { GenericModalContent } from './renderers/generic-modal-content';

/**
 * InfoModal is a generic, reusable modal component that displays informational content.
 *
 * This modal accepts structured data from adapters and handles all rendering logic internally.
 * It supports different modal types: installment payment plans and generic content.
 *
 * The adapter should return plain data (not React components), and this modal transforms
 * that data into the appropriate UI structure.
 *
 * @param props - Component props
 * @param props.open - Whether the modal is open
 * @param props.onOpenChange - Callback when modal open state changes
 * @param props.data - Structured modal data from adapter
 * @param props.className - Optional custom className for the dialog content
 * @returns ReactElement
 */
export default function InfoModal({ open, onOpenChange, data, className }: InfoModalProps): ReactElement {
    const currency = useCurrency() || 'USD';

    if (!data) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className={className}>
                    <DialogHeader>
                        <DialogTitle>Information</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 text-muted-foreground">No data available.</div>
                </DialogContent>
            </Dialog>
        );
    }

    const modalType = data.type || (data.paymentSchedule ? 'payment-schedule' : 'generic');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={className}>
                {/* Header */}
                {(data.title || data.description) && (
                    <DialogHeader>
                        {data.title && <DialogTitle>{data.title}</DialogTitle>}
                        {data.description && <DialogDescription>{data.description}</DialogDescription>}
                    </DialogHeader>
                )}

                {/* Content based on modal type - delegates to specific renderers */}
                <div className="mt-4">
                    {modalType === 'payment-schedule' && (
                        <PaymentScheduleModalContent
                            paymentSchedule={data.paymentSchedule}
                            steps={data.steps}
                            disclaimer={data.disclaimer}
                            links={data.links}
                            currency={currency}
                        />
                    )}

                    {modalType === 'generic' && data.content && <GenericModalContent content={data.content} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
