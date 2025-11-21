import type { DataStrategyResult, MiddlewareFunction, RouterContextProvider } from 'react-router';
import { getAuth } from '@/middlewares/auth.client';
import { getConfig } from '@/config';
import {
    createEvent,
    sendViewPageEvent,
    initializeEventMediator,
    type EventMediator,
} from '@salesforce/storefront-next-runtime/events';
import { getAllAdapters } from '@/lib/adapters';

/**
 * As we're on the client, we can define and use a singleton analytics mediator instance here.
 * This ensures the same mediator instance is used across the application.
 */
const eventMediatorCache: { ref: EventMediator | undefined } = { ref: undefined };

/**
 * Get or initialize the analytics mediator singleton
 * This ensures we only create one instance that's shared across the application.
 * The mediator uses getAllAdapters as a function reference, so it will always
 * get the latest adapters from the registry when tracking events.
 *
 * This function initializes the mediator on-demand if it doesn't exist yet,
 * ensuring it's available even if called before middleware runs (e.g., during
 * initial hydration when useAnalytics is called).
 *
 * @returns Analytics mediator instance
 */
export const getOrInitializeEventMediator = (): EventMediator => {
    if (!eventMediatorCache.ref) {
        eventMediatorCache.ref = initializeEventMediator(getAllAdapters);
    }
    return eventMediatorCache.ref;
};

/**
 * Check if a pathname represents a page view to track
 *
 * Tracks all pages by default, except those that start with blocked path prefixes.
 *
 * Configure which routes are blocked in the app config.analytics.doNotTrackPaths array.
 *
 * By default we block API routes, action routes, resource routes, and OAuth2 routes.
 *
 * @param pathname - The pathname from the request URL
 * @returns true if this is a page view to track, false otherwise
 */
const shouldTrackPageView = (pathname: string, context: Readonly<RouterContextProvider>): boolean => {
    const config = getConfig(context);
    const blockedPaths = config.engagement.analytics.doNotTrackPaths;
    // Block paths that start with any of the blocked prefixes
    return !blockedPaths.some((blocked) => pathname.startsWith(blocked));
};

/**
 * Client-side middleware for sending page view events for the current page
 *
 * This middleware:
 * 1. Initializes the analytics mediator singleton if not already initialized
 * 2. Tracks a view_page event for the current page path if the page is in the list of pages to track
 */
const viewPageEventMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async (
    { context, request },
    next
) => {
    const eventMediator = getOrInitializeEventMediator();

    const path = new URL(request.url).pathname;

    // Track page views for the pages we want to track
    // This prevents tracking page views for API routes, resource routes, and action routes
    if (shouldTrackPageView(path, context)) {
        const auth = getAuth(context);

        const event = createEvent('view_page', {
            path,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });

        sendViewPageEvent(event, eventMediator);
    }

    return next();
};

export default viewPageEventMiddleware;
