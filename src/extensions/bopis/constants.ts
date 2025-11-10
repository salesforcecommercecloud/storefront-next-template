/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Constants
export const DELIVERY_OPTIONS = {
    DELIVERY: 'delivery',
    PICKUP: 'pickup',
} as const;

export type DeliveryOption = (typeof DELIVERY_OPTIONS)[keyof typeof DELIVERY_OPTIONS];
