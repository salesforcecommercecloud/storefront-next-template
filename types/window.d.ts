/**
 * Global window object extensions for SFCC Odyssey
 */
declare global {
    interface Window {
        /**
         * The unique identifier for the current bundle.
         * Injected from BUNDLE_ID environment variable, defaults to 'local'.
         * This property is injected by @salesforce/storefront-next-dev package.
         *
         * @example 'local' | '140'
         */
        _BUNDLE_ID: string;

        /**
         * The path to the client bundle assets.
         * Constructed as `/mobify/bundle/${bundleId}/client/`
         * This property is injected by @salesforce/storefront-next-dev package.
         *
         * @example '/mobify/bundle/local/client/' | '/mobify/bundle/140/client/'
         */
        _BUNDLE_PATH: string;
    }
}

export {};
