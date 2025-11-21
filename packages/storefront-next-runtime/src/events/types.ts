/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type ShopperBasketsTypes, type ShopperProductsTypes, type ShopperSearchTypes } from 'commerce-sdk-isomorphic';

// ============================================================================
// Analytics Payload Types
// ============================================================================

/**
 * Interface for analytics user properties.
 * This can be extended by external code via module augmentation without modifying the events module.
 *
 * @example
 * ```typescript
 * declare module '@storefront-next/runtime/events' {
 *   interface AnalyticsUser {
 *     customField: string;
 *     preferences: Record<string, any>;
 *     loyaltyTier?: 'bronze' | 'silver' | 'gold';
 *   }
 * }
 * ```
 */
export interface AnalyticsUser {
    userType: 'registered' | 'guest';
    usid?: string;
    sid?: string;
    encUserId?: string;
    customerId?: string;
    customerNo?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

/**
 * Placeholder type for future payload types.
 * This allows the payload union to be extended in the future.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PayloadTbd {
    // Placeholder for future payload types
}

/**
 * Union type for analytics event payloads.
 * Currently includes AnalyticsUser, with PayloadTbd as a placeholder for future types.
 */
export type AnalyticsPayload = AnalyticsUser | PayloadTbd;

// ============================================================================
// Event Types
// ============================================================================

export type BaseEvent = {
    eventType: string;
    payload: AnalyticsPayload;
    deviceInfo?: string;
};

export interface ViewPageEvent extends BaseEvent {
    eventType: 'view_page';
    path: string;
}

export interface ViewProductEvent extends BaseEvent {
    eventType: 'view_product';
    product: ShopperProductsTypes.Product;
}

export interface ViewSearchEvent extends BaseEvent {
    eventType: 'view_search';
    searchInputText: string;
    searchResults: ShopperSearchTypes.ProductSearchHit[];
}

export interface ViewCategoryEvent extends BaseEvent {
    eventType: 'view_category';
    category: ShopperProductsTypes.Category;
    searchResults: ShopperSearchTypes.ProductSearchHit[];
}

export interface ViewRecommenderEvent extends BaseEvent {
    eventType: 'view_recommender';
    recommenderId: string;
    recommenderName: string;
    products: ShopperSearchTypes.ProductSearchHit[];
}

export interface ClickProductInCategoryEvent extends BaseEvent {
    eventType: 'click_product_in_category';
    category: ShopperProductsTypes.Category;
    product: ShopperSearchTypes.ProductSearchHit;
}

export interface ClickProductInSearchEvent extends BaseEvent {
    eventType: 'click_product_in_search';
    searchInputText: string;
    product: ShopperSearchTypes.ProductSearchHit;
}

export interface ClickProductInRecommenderEvent extends BaseEvent {
    eventType: 'click_product_in_recommender';
    recommenderId: string;
    recommenderName: string;
    product: ShopperSearchTypes.ProductSearchHit;
}

export interface CartItemAddEvent extends BaseEvent {
    eventType: 'cart_item_add';
    cartItems: Array<ShopperBasketsTypes.ProductItem>;
}

export interface CheckoutStartEvent extends BaseEvent {
    eventType: 'checkout_start';
    basket: ShopperBasketsTypes.Basket;
}

export interface CheckoutStepEvent extends BaseEvent {
    eventType: 'checkout_step';
    stepName: string;
    stepNumber: number;
    basket: ShopperBasketsTypes.Basket;
}

/**
 * Interface for custom analytics events.
 * Extend this interface via module augmentation.
 *
 * @example
 * ```typescript
 * declare module '@storefront-next/runtime/events' {
 *   interface AnalyticsEventExtensions {
 *     CustomEvent: BaseEvent & { eventType: 'custom'; data: string };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AnalyticsEventExtensions {
    // This interface can be extended by external code
}

/**
 * Union type for all analytics events.
 *
 * Custom types can be added by extending the AnalyticsEventExtensions interface.
 */
export type AnalyticsEvent =
    | ViewPageEvent
    | ViewProductEvent
    | ViewSearchEvent
    | ViewCategoryEvent
    | ViewRecommenderEvent
    | ClickProductInCategoryEvent
    | ClickProductInSearchEvent
    | ClickProductInRecommenderEvent
    | CartItemAddEvent
    | CheckoutStartEvent
    | CheckoutStepEvent
    | AnalyticsEventExtensions[keyof AnalyticsEventExtensions];

/**
 * Helper type for mapping event_type to the corresponding event type.
 */
export type EventTypeMap = {
    [K in AnalyticsEvent as K['eventType']]: K;
};

/**
 * Helper type for extracting event payload data for a given event type.
 */
export type EventPayload<T extends AnalyticsEvent['eventType']> = Omit<EventTypeMap[T], 'eventType' | 'payload'> & {
    payload: AnalyticsPayload;
};

// ============================================================================
// Event System Types
// ============================================================================

/**
 * Minimal interface for engagement adapters that can send analytics events.
 * Engagemet Adapters must implement this interface to work with the event mediator.
 */
export interface EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
}

/**
 * Generic event mediator interface for tracking events.
 * This can be used for analytics, telemetry, or any other event tracking system.
 */
export type EventMediator = {
    track: (event: AnalyticsEvent) => void;
};
