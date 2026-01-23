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

import { type ReactNode } from 'react';

/**
 * Payment schedule data for installment payment modal
 */
export interface PaymentSchedule {
    /** Total purchase amount */
    totalAmount: number;
    /** Number of payments */
    numberOfPayments: number;
    /** Individual payment details */
    payments: Array<{
        /** Payment amount */
        amount: number;
        /** Due date or relative time (e.g., "Today", "2 weeks") */
        dueDate: string;
    }>;
}

/**
 * Step information for "How it works" sections
 */
export interface StepInfo {
    /** Step number */
    number: number;
    /** Step description text */
    text: string;
}

/**
 * Link information for footer links
 */
export interface ModalLink {
    /** Link text */
    text: string;
    /** Link URL */
    url: string;
    /** Whether to open in new tab */
    openInNewTab?: boolean;
}

/**
 * Structured data for different modal types
 */
export interface InfoModalData {
    /** Modal type - determines rendering logic */
    type?: 'payment-schedule' | 'generic';
    /** Modal title */
    title?: string;
    /** Modal description/subtitle */
    description?: string;

    // Payment schedule-specific data
    /** Payment schedule for payment plans */
    paymentSchedule?: PaymentSchedule;
    /** Steps for "How it works" section */
    steps?: StepInfo[];
    /** Disclaimer text */
    disclaimer?: string;
    /** Footer links */
    links?: ModalLink[];

    /** Generic content (ReactNode) - used when type is 'generic' or no specific type data */
    content?: ReactNode;
}

export interface InfoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Modal data - structured data from adapter */
    data?: InfoModalData;
    /** Optional custom className for the dialog content */
    className?: string;
}
