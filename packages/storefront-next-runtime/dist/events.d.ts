import { ShopperBasketsTypes, ShopperProductsTypes, ShopperSearchTypes } from "commerce-sdk-isomorphic";

//#region src/events/types.d.ts

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
interface AnalyticsUser {
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
interface PayloadTbd {}
/**
 * Union type for analytics event payloads.
 * Currently includes AnalyticsUser, with PayloadTbd as a placeholder for future types.
 */
type AnalyticsPayload = AnalyticsUser | PayloadTbd;
type BaseEvent = {
  eventType: string;
  payload: AnalyticsPayload;
  deviceInfo?: string;
};
interface ViewPageEvent extends BaseEvent {
  eventType: 'view_page';
  path: string;
}
interface ViewProductEvent extends BaseEvent {
  eventType: 'view_product';
  product: ShopperProductsTypes.Product;
}
interface ViewSearchEvent extends BaseEvent {
  eventType: 'view_search';
  searchInputText: string;
  searchResults: ShopperSearchTypes.ProductSearchHit[];
}
interface ViewCategoryEvent extends BaseEvent {
  eventType: 'view_category';
  category: ShopperProductsTypes.Category;
  searchResults: ShopperSearchTypes.ProductSearchHit[];
}
interface ViewRecommenderEvent extends BaseEvent {
  eventType: 'view_recommender';
  recommenderId: string;
  recommenderName: string;
  products: ShopperSearchTypes.ProductSearchHit[];
}
interface ClickProductInCategoryEvent extends BaseEvent {
  eventType: 'click_product_in_category';
  category: ShopperProductsTypes.Category;
  product: ShopperSearchTypes.ProductSearchHit;
}
interface ClickProductInSearchEvent extends BaseEvent {
  eventType: 'click_product_in_search';
  searchInputText: string;
  product: ShopperSearchTypes.ProductSearchHit;
}
interface ClickProductInRecommenderEvent extends BaseEvent {
  eventType: 'click_product_in_recommender';
  recommenderId: string;
  recommenderName: string;
  product: ShopperSearchTypes.ProductSearchHit;
}
interface CartItemAddEvent extends BaseEvent {
  eventType: 'cart_item_add';
  cartItems: Array<ShopperBasketsTypes.ProductItem>;
}
interface CheckoutStartEvent extends BaseEvent {
  eventType: 'checkout_start';
  basket: ShopperBasketsTypes.Basket;
}
interface CheckoutStepEvent extends BaseEvent {
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
interface AnalyticsEventExtensions {}
/**
 * Union type for all analytics events.
 *
 * Custom types can be added by extending the AnalyticsEventExtensions interface.
 */
type AnalyticsEvent = ViewPageEvent | ViewProductEvent | ViewSearchEvent | ViewCategoryEvent | ViewRecommenderEvent | ClickProductInCategoryEvent | ClickProductInSearchEvent | ClickProductInRecommenderEvent | CartItemAddEvent | CheckoutStartEvent | CheckoutStepEvent | AnalyticsEventExtensions[keyof AnalyticsEventExtensions];
/**
 * Helper type for mapping event_type to the corresponding event type.
 */
type EventTypeMap = { [K in AnalyticsEvent as K['eventType']]: K };
/**
 * Helper type for extracting event payload data for a given event type.
 */
type EventPayload<T extends AnalyticsEvent['eventType']> = Omit<EventTypeMap[T], 'eventType' | 'payload'> & {
  payload: AnalyticsPayload;
};
/**
 * Minimal interface for engagement adapters that can send analytics events.
 * Engagemet Adapters must implement this interface to work with the event mediator.
 */
interface EventAdapter {
  name: string;
  sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
}
/**
 * Generic event mediator interface for tracking events.
 * This can be used for analytics, telemetry, or any other event tracking system.
 */
type EventMediator = {
  track: (event: AnalyticsEvent) => void;
};
//#endregion
//#region src/events/events.d.ts
/**
 * Type-safe event creation function
 *
 * This generic function allows creating any event type under AnalyticsEvent
 * with full type safety. The event type is inferred from the string literal
 * passed as the first parameter, and TypeScript will enforce the correct
 * data properties for that specific event type.
 *
 * @example
 * ```typescript
 * const viewPageEvent = createEvent('view_page', { path: '/products', payload });
 * const viewProductEvent = createEvent('view_product', { product, payload });
 * ```
 */
declare function createEvent<T extends AnalyticsEvent['eventType']>(eventType: T, data: EventPayload<T>): EventTypeMap[T];
/**
 * Send a view page event to the event mediator
 *
 * This wrapper function is used in the automated page view event tracking client middleware.
 * This function exists to support build-time checks and type safety.
 *
 * @param event - The view page event to send
 * @param eventMediator - The event mediator to send the event to
 */
declare function sendViewPageEvent(event: ViewPageEvent, eventMediator: EventMediator): void;
//#endregion
//#region src/events/mediator.d.ts
/**
 * Initialize event mediator
 *
 * @param getAdapters - Function that returns the current array of engagmenet adapters.
 *                      This function is called on each track() invocation to ensure
 *                      the mediator always uses the latest adapters from the adapter registry.
 * @returns EventMediator instance
 */
declare function initializeEventMediator(getAdapters: () => EventAdapter[]): EventMediator;
//#endregion
export { AnalyticsEvent, AnalyticsEventExtensions, AnalyticsPayload, AnalyticsUser, BaseEvent, CartItemAddEvent, CheckoutStartEvent, CheckoutStepEvent, ClickProductInCategoryEvent, ClickProductInRecommenderEvent, ClickProductInSearchEvent, EventAdapter, EventMediator, EventPayload, EventTypeMap, PayloadTbd, ViewCategoryEvent, ViewPageEvent, ViewProductEvent, ViewRecommenderEvent, ViewSearchEvent, createEvent, initializeEventMediator, sendViewPageEvent };
//# sourceMappingURL=events.d.ts.map