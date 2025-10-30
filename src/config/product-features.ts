/**
 * Product Features Configuration
 *
 * Defines configuration options for the ProductFeatures component,
 * including delimiter settings and styling options for different content types.
 */

export interface ProductFeaturesConfig {
    /** Delimiter used to separate features in longDescription. Defaults to '|' */
    delimiter: string;
    /** CSS classes applied when content is detected as HTML fragment */
    htmlFragmentClassName: string;
}

/**
 * Default configuration for ProductFeatures component
 */
export const DEFAULT_PRODUCT_FEATURES_CONFIG: ProductFeaturesConfig = {
    delimiter: '|',
    htmlFragmentClassName:
        "text-sm text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:list-none [&_ul]:m-0 [&_ul]:p-0 [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_li]:before:content-[''] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:flex-shrink-0 [&_li]:before:rounded-full [&_li]:before:bg-primary",
};
