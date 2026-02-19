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

import defaultTheme from 'tailwindcss/defaultTheme';
import type { AppConfig } from '@/config/context';

// Pre-compiled regex patterns for better performance (compiled once at module load)
/** Matches DIS path and captures the realm: /dw/image/v2/REALM_ID/... */
const DIS_PATH_REALM_REGEX = /\/dw\/image\/v\d+\/([^/]+)/i;
/** Matches DIS path prefix and captures the remaining path */
const DIS_PATH_STRIP_REGEX = /\/dw\/image\/v\d+\/[^/]+(\/.*)/i;
/** Matches DynamicImage placeholder syntax: [?sw={width}], [_{width}], etc. */
const PLACEHOLDER_REGEX = /\[[^\]]*\]/g;
/** Matches file extension at end of path: .jpg, .png, etc. */
const FILE_EXTENSION_REGEX = /\.([^.]+)$/;
/** Tests if URL contains DIS path structure */
const IS_DIS_URL_REGEX = /\/dw\/image\/v\d+\//i;
/** Matches dashes for realm conversion (zzrf-001 -> ZZRF_001) */
const DASH_REGEX = /-/g;
/** Tests if URL contains sfrm query parameter (must be preceded by ? or &) */
const HAS_SFRM_PARAM_REGEX = /[?&]sfrm=/;
/** Tests if URL contains quality (q) query parameter (must be preceded by ? or &) */
const HAS_QUALITY_PARAM_REGEX = /[?&]q=/;

export type Image = {
    disBaseLink?: string;
    link?: string;
    [key: string]: unknown;
};

export type DisImageOptions = {
    disHost?: string;
    format?: 'avif' | 'gif' | 'jp2' | 'jpg' | 'jpeg' | 'jxr' | 'png' | 'webp';
    width?: number;
    quality?: number;
    sourceFormat?: string;
};

export type ImageUrlParams = {
    /** The source image URL to transform */
    src?: string | undefined;
    /** Optional DIS transformation options (format, width, quality) */
    options?: DisImageOptions;
    /** App config containing DIS host and quality settings */
    config?: AppConfig;
    /** Image object */
    image?: Image;
};

function getRealmFromUrl(url: URL): string | undefined {
    // Only extract realm from SFCC Commerce Cloud URLs
    // Example host: zzrf-001.dx.commercecloud.salesforce.com -> realm ZZRF_001
    const isSfccHost =
        url.hostname.endsWith('.commercecloud.salesforce.com') || url.hostname.endsWith('.demandware.net');
    if (!isSfccHost) {
        return undefined;
    }

    const subdomain = url.hostname.split('.')?.[0];
    if (!subdomain) {
        return undefined;
    }
    const realm = subdomain.replace(DASH_REGEX, '_').toUpperCase();
    return realm || undefined;
}

function getRealm(url: URL): string | undefined {
    const realmFromPath = url.pathname.match(DIS_PATH_REALM_REGEX)?.[1];
    if (realmFromPath) {
        return realmFromPath.toUpperCase();
    }
    return getRealmFromUrl(url);
}

function stripDisPath(pathname: string): string {
    const disPathMatch = pathname.match(DIS_PATH_STRIP_REGEX);
    return disPathMatch?.[1] || pathname;
}

/**
 * Utility helper to convert B2C Commerce static asset URLs into Dynamic Imaging Service (DIS) URLs.
 *
 * Example:
 * https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwa6379acf/images/slot/landing/cat-landing-slotbanner-mens.jpg
 * becomes
 * https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-storefront-catalog-m-non-en/default/dwa6379acf/images/slot/landing/cat-landing-slotbanner-mens.webp?sfrm=jpg
 *
 * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_image_transformation_service.htm&type=5}
 */
export function toDisImageUrl({ src, options = {}, config }: ImageUrlParams): string | undefined {
    if (!src) {
        return undefined;
    }

    try {
        // Extract and preserve any DynamicImage placeholder syntax (e.g., [?sw={width}])
        // These will be appended to the final URL for DynamicImage to process
        const placeholders = src.match(PLACEHOLDER_REGEX) || [];
        const cleanUrl = src.replace(PLACEHOLDER_REGEX, '');
        const url = new URL(cleanUrl);
        const disHost = options.disHost || config?.images?.host;
        if (!disHost) {
            return undefined;
        }
        const realm = getRealm(url);
        if (!realm) {
            return undefined;
        }

        // Remove any existing DIS prefix so we don't duplicate /dw/image/v2/{realm}
        const normalizedPathname = stripDisPath(url.pathname);

        // Derive formats
        const extMatch = normalizedPathname.match(FILE_EXTENSION_REGEX);
        const sourceFormat = options.sourceFormat || extMatch?.[1]?.toLowerCase() || 'jpg';
        const targetFormat = options.format || 'webp';

        // Replace the extension with target format
        const disPath = normalizedPathname.replace(FILE_EXTENSION_REGEX, `.${targetFormat}`);

        // Build query params
        const search = new URLSearchParams(url.search);
        search.set('sfrm', sourceFormat);
        if (options.width) {
            search.set('sw', String(options.width));
        }
        const quality = options.quality ?? config?.images?.quality;
        search.set('q', String(quality));

        const query = search.toString();
        const baseUrl = `${disHost}/dw/image/v2/${realm}${disPath}${query ? `?${query}` : ''}`;
        // Append preserved placeholders for DynamicImage to process
        return placeholders.length > 0 ? `${baseUrl}${placeholders.join('')}` : baseUrl;
    } catch {
        return undefined;
    }
}

/**
 * Converts an image URL to an optimized format, with graceful fallback.
 *
 * Unlike `toDisImageUrl` which returns `undefined` for non-SFCC URLs,
 * this function returns the original URL as a fallback, making it safer
 * for use with images that may or may not be from SFCC.
 *
 * @param params - Object containing src, options, and config
 * @param params.src - The image URL to transform
 * @param params.options - Optional DIS transformation options (format, width, quality)
 * @param params.config - App config containing DIS host and quality settings
 * @returns Transformed DIS URL, or original URL if transformation not possible
 *
 * @example
 * // SFCC URL - transforms to DIS WebP
 * toImageUrl({ src: 'https://zzrf-001.dx.commercecloud.salesforce.com/.../image.jpg', config })
 * // → 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/.../image.webp?sfrm=jpg&q=70'
 *
 * // Already DIS URL - ensures WebP format
 * toImageUrl({ src: 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/.../image.jpg', config })
 * // → 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/.../image.webp?sfrm=jpg'
 *
 * // Non-SFCC URL - returns original (fallback)
 * toImageUrl({ src: 'https://example.com/image.jpg', config })
 * // → 'https://example.com/image.jpg'
 */
export function toImageUrl({ src, options = {}, config, image }: ImageUrlParams): string | undefined {
    const imageUrl = src || image?.disBaseLink || image?.link;

    if (!imageUrl) {
        return undefined;
    }

    try {
        // Extract and preserve any DynamicImage placeholder syntax (e.g., [?sw={width}])
        const placeholders = imageUrl.match(PLACEHOLDER_REGEX) || [];
        const cleanUrl = imageUrl.replace(PLACEHOLDER_REGEX, '');

        // If already a DIS URL, ensure correct format and add quality if not present
        const isDisUrl = IS_DIS_URL_REGEX.test(cleanUrl);
        if (isDisUrl) {
            const targetFormat = options.format || 'webp';
            let transformedUrl = replaceImageFormat(cleanUrl, targetFormat);

            // Add quality parameter if not already present
            const quality = options.quality ?? config?.images?.quality;
            if (quality && !HAS_QUALITY_PARAM_REGEX.test(transformedUrl)) {
                const separator = transformedUrl.includes('?') ? '&' : '?';
                transformedUrl = `${transformedUrl}${separator}q=${quality}`;
            }

            return placeholders.length > 0 ? `${transformedUrl}${placeholders.join('')}` : transformedUrl;
        }

        // Try to convert to DIS URL
        const disUrl = toDisImageUrl({ src: imageUrl, options, config });
        // If conversion succeeded, return DIS URL; otherwise return original URL as fallback
        return disUrl ?? imageUrl;
    } catch {
        // On any error, return the original URL
        return imageUrl;
    }
}

/**
 * Supported target formats of Salesforce's Dynamic Imaging Service are: avif, gif, jp2, jpg, jpeg, jxr, png, and webp.
 * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_image_transformation_service.htm&type=5}
 * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_creating_image_transformation_urls.htm&type=5}
 */
type DynamicImageFormat = 'avif' | 'gif' | 'jp2' | 'jpg' | 'jpeg' | 'jxr' | 'png' | 'webp';

export const defaultImageFormats: Array<DynamicImageFormat> = ['webp'];

const vwValue = /^[\d.]+vw$/;
const pxValue = /^[\d.]+px$/;
const emValue = /^[\d.]+em$/;
const remValue = /^[\d.]+rem$/;
const imageExtensions = /\.(avif|gif|jp2|jpe?g|png|tiff?|webp)(?=\?|$)/i;

// Tailwind CSS default breakpoints (converted from rem to px)
const defaultBreakpoints = {
    base: '0px',
    ...Object.fromEntries(
        Object.entries(defaultTheme.screens).map(([key, value]) => [
            key,
            remValue.test(value) ? `${parseFloat(value) * 16}px` : value,
        ])
    ),
} as const;

type Breakpoints = typeof defaultBreakpoints;
type BreakpointKey = keyof Breakpoints;

const getBreakpointLabels = (breakpoints: Record<string, string>): string[] =>
    Object.entries(breakpoints)
        .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
        .map(([key]) => key);

let themeBreakpoints = defaultBreakpoints;
let breakpointLabels = getBreakpointLabels(themeBreakpoints);

/**
 * Helper to create very specific `media` attributes for responsive preload purposes.
 * @see {@link https://web.dev/articles/preload-responsive-images#picture}
 */
const obtainImageLinkMedia = (
    breakpointIndex: number,
    inputWidthsLength: number
): { min?: string; max?: string } | undefined => {
    const toMediaValue = (bp: string, type: 'min' | 'max') => {
        const val = themeBreakpoints[bp as BreakpointKey];
        if (emValue.test(val)) {
            // em value
            const parsed = parseFloat(val);
            return { [type]: type === 'max' ? `${parsed - 0.01}em` : `${parsed}em` };
        }

        const parsed = parseInt(val, 10);
        return { [type]: type === 'max' ? `${parsed - 1}px` : `${parsed}px` };
    };

    const nextBp = breakpointLabels[breakpointIndex + 1];
    const currentBp = breakpointLabels[breakpointIndex];
    if (breakpointIndex === 0) {
        // first
        return nextBp ? toMediaValue(nextBp, 'max') : undefined;
    } else if (breakpointIndex >= inputWidthsLength - 1) {
        // last - use inputWidthsLength instead of breakpointLabels.length
        return currentBp ? toMediaValue(currentBp, 'min') : undefined;
    }
    return currentBp && nextBp ? { ...toMediaValue(currentBp, 'min'), ...toMediaValue(nextBp, 'max') } : undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isObject = (o: any): o is Record<string, any> => o?.constructor === Object;

/**
 * @example
 * // returns the array [10, 10, 10, 50]
 * widthsAsArray({base: 10, lg: 50})
 */
const widthsAsArray = (widths: Record<string, number | string>): (number | string)[] => {
    const biggestBreakpoint = breakpointLabels.filter((bp) => Boolean(widths[bp])).pop();

    if (!biggestBreakpoint) {
        return [];
    }

    const biggestBreakpointIndex = breakpointLabels.indexOf(biggestBreakpoint);
    let mostRecent: number | string | undefined;
    return breakpointLabels
        .slice(0, biggestBreakpointIndex + 1)
        .map((bp) => {
            if (widths[bp]) {
                mostRecent = widths[bp];
                return widths[bp];
            }
            return mostRecent;
        })
        .filter((item): item is number | string => item !== undefined);
};

const emToPx = (em: number, browserDefaultFontSize = 16): number => Math.round(em * browserDefaultFontSize);

const vwToPx = (vw: number, breakpoint: string): number => {
    const result = (vw / 100) * parseFloat(themeBreakpoints[breakpoint as BreakpointKey]);
    const breakpointsDefinedInPx = Object.values(themeBreakpoints).some((val) => pxValue.test(val));

    // Assumes theme's breakpoints are defined in either em or px
    return breakpointsDefinedInPx ? result : emToPx(result);
};

/**
 * Replaces the image file extension in a URL with a configurable target format, e.g. `webp`.
 * Handles URLs with query parameters correctly.
 * If the format changes, appends the original extension as `sfrm` parameter.
 * @example
 * // returns 'https://example.com/image.webp?sw=460&q=60&sfrm=jpg'
 * replaceImageFormat('https://example.com/image.jpg?sw=460&q=60')
 */
export const replaceImageFormat = (
    url: string,
    targetFormat: 'webp' | 'avif' | 'gif' | 'jp2' | 'jpg' | 'jpeg' | 'jxr' | 'png' = 'webp'
): string => {
    // If URL already has sfrm parameter, it's already been transformed - return as-is
    if (HAS_SFRM_PARAM_REGEX.test(url)) {
        return url;
    }

    const match = url.match(imageExtensions);
    if (!match) {
        return url;
    }

    const originalExtension = match[1].toLowerCase();
    if (originalExtension === targetFormat) {
        return url;
    }

    const newUrl = url.replace(imageExtensions, `.${targetFormat}`);
    const separator = newUrl.includes('?') ? '&' : '?';
    return `${newUrl}${separator}sfrm=${originalExtension}`;
};

/**
 * @example
 * // returns https://example.com/image_720.webp?sw=720&q=60&sfrm=jpg
 * getSrc('https://example.com/image[_{width}].jpg', 720, 60)
 */
export const getSrc = (dynamicSrc: string, imageWidth: number, quality?: number): string => {
    const getSep = (res: string): '?' | '&' => (res.includes('?') ? '&' : '?');
    const hasUrlParam = (url: string, param: string) => new RegExp(`[?&]${param}=`).test(url);

    // 1. Remove eventual surrounding brackets, i.e., []
    // 2. Make sure that invalid edge cases, where the DIS instructions like `[?sw={width}]` are added to an already
    // parameterized URL, are handled correctly
    // 3. Replace eventual `{width}` placeholder with actual `imageWidth`
    let result = dynamicSrc
        .replace(/\[([?&]?)([^\]]+)]/g, (_match, _sep, content, offset, fullString) => {
            const beforeMatch = fullString?.slice?.(0, offset);
            return `${getSep(beforeMatch)}${content}`;
        })
        .replace(/\{[^}]+}/g, imageWidth.toString());

    // Handle URLs that already have sw= parameter
    if (hasUrlParam(result, 'sw')) {
        result = result.replace(/([?&])sw=\d+/, `$1sw=${imageWidth}`);
    } else {
        result = `${result}${getSep(result)}sw=${imageWidth}`;
    }

    // Handle quality parameter - existing q= in URL takes priority
    if (typeof quality === 'number' && Number.isInteger(quality) && !hasUrlParam(result, 'q')) {
        result = `${result}${getSep(result)}q=${quality}`;
    }

    return replaceImageFormat(result);
};

/**
 * @example
 * // Returns 'https://example.com/image.jpg'
 * getSrcWithoutOptionalParams('https://example.com/image.jpg[?sw={width}]')
 */
const getSrcWithoutOptionalParams = (dynamicSrc: string): string => dynamicSrc.replace(/\[[^\]]+]/g, '');

const padArray = (arr: (number | string)[]): (number | string)[] => {
    const l1 = arr.length;
    const l2 = breakpointLabels.length;
    if (l1 < l2) {
        const lastEntry = arr[arr.length - 1];
        const amountToPad = l2 - l1;
        return [...arr, ...Array(amountToPad).fill(lastEntry)];
    }
    return arr;
};

const convertToPxNumbers = (widths: (number | string)[]): number[] =>
    widths
        .map((width, i) => {
            if (typeof width === 'number') {
                return width;
            }

            if (vwValue.test(width)) {
                const vw = parseFloat(width);
                const currentBp = breakpointLabels[i];
                // We imagine the biggest image for the current breakpoint
                // to be when the viewport is closely approaching the _next breakpoint_.
                const nextBp = breakpointLabels[i + 1];

                if (nextBp) {
                    return vwToPx(vw, nextBp);
                }
                // We're already at the last breakpoint
                return widths[i] !== widths[i - 1] ? vwToPx(vw, currentBp) : undefined;
            } else if (pxValue.test(width)) {
                return parseInt(width, 10);
            } else {
                // eslint-disable-next-line no-console
                console.error('Expecting to see values with vw or px unit only', {
                    namespace: 'utils.convertToPxNumbers',
                });
                return 0;
            }
        })
        .filter((width): width is number => width !== undefined);

type ImageLink = {
    type: string;
    srcSet: string;
    sizes: string;
    media: { min?: string; max?: string };
};

type ConvertedImageLink = {
    type: string;
    srcSet: string;
    sizes: string;
    media: string;
};

/**
 * Transforms an array of preload link objects by converting the raw `media`
 * property of each entry (with `min` and/or `max` values) into actual media
 * queries using `(min-width)` and/or `(max-width)`.
 */
const convertImageLinksMedia = (links: ImageLink[]): ConvertedImageLink[] =>
    links.map((link) => {
        const {
            media: { min, max },
        } = link;
        const acc: string[] = [];
        if (min) {
            acc.push(`(min-width: ${min})`);
        }
        if (max) {
            acc.push(`(max-width: ${max})`);
        }
        return { ...link, media: acc.join(' and ') };
    });

type Source = {
    type: string;
    srcSet: string;
    sizes: string;
    media: string;
};

type ResponsiveData = {
    sources: Source[];
    links: ConvertedImageLink[];
};

const toMimeType = (format: DynamicImageFormat) => (format === 'jpg' ? 'image/jpeg' : `image/${format}`);

/**
 * Determines the data required for the responsive `<source>` and `<link rel="preload" type="image/{format}">
 * portions/elements.
 */
const getResponsiveSourcesAndLinks = (
    src: string,
    { widths, formats, quality }: { widths: (number | string)[]; formats: Array<DynamicImageFormat>; quality?: number }
): ResponsiveData => {
    // By default, unitless value is interpreted as px
    const sizesWidths = widths.map((width) => (typeof width === 'number' ? `${width}px` : width));
    const l = sizesWidths.length;

    const _sizes = breakpointLabels.map((bp, i) => {
        return i === 0
            ? {
                  media: '',
                  mediaLink: obtainImageLinkMedia(i, l),
                  sizes: sizesWidths[i],
              }
            : {
                  media: `(min-width: ${themeBreakpoints[bp as BreakpointKey]})`,
                  mediaLink: obtainImageLinkMedia(i, l),
                  sizes: sizesWidths.at(i >= l ? l - 1 : i),
              };
    });

    const sourcesWidths = convertToPxNumbers(padArray(widths));
    const sourcesLength = sourcesWidths.length;
    const { sources, links } = breakpointLabels.reduce(
        (acc: { sources: Source[]; links: ImageLink[] }, _bp, idx) => {
            // To support higher-density devices, request all images in 1x and 2x widths
            const width = sourcesWidths[idx >= sourcesLength ? sourcesLength - 1 : idx];
            const sizeData = _sizes[idx];
            if (!sizeData || !width) {
                return acc;
            }

            const { sizes, media, mediaLink } = sizeData;
            const firstSource = acc.sources[0];
            const lastLink = acc.links[acc.links.length - 1];
            const srcSet = [1, 2]
                .map((factor) => {
                    const effectiveWidth = Math.round(width * factor);
                    const effectiveSize = Math.round(width * factor);

                    return `${getSrc(src, effectiveSize, quality)} ${effectiveWidth}w`;
                })
                .join(', ');

            if (idx < sourcesLength && sizes && (firstSource?.sizes !== sizes || srcSet !== firstSource?.srcSet)) {
                // Only store new `<source>` if we haven't already stored those values
                // Insert at beginning to achieve reversed `<source>` order
                for (let i = formats.length - 1; i >= 0; i--) {
                    acc.sources.unshift({ type: toMimeType(formats[i]), srcSet, sizes, media });
                }
            }

            if (sizes && (lastLink?.sizes !== sizes || srcSet !== lastLink?.srcSet)) {
                // Only store new `<link>` if we haven't already stored those values
                for (const format of formats) {
                    acc.links.push({ type: toMimeType(format), srcSet, sizes, media: mediaLink || {} });
                }
            } else if (lastLink && mediaLink) {
                // If we have already stored those values, update the `max` portion of the related `<link>` data
                if (mediaLink.max) {
                    lastLink.media.max = mediaLink.max;
                }
            }
            return acc;
        },
        { sources: [], links: [] }
    );
    return { sources, links: convertImageLinksMedia(links) };
};

/**
 * Resolve the attributes required to create a DIS-optimized `<picture>` component.
 */
export const getResponsivePictureAttributes = ({
    src,
    widths,
    formats = defaultImageFormats,
    breakpoints = defaultBreakpoints,
    quality,
}: {
    src: string;
    /**
     * Image widths relative to the breakpoints. Supports multiple formats:
     * - Array of numbers: [100, 360, 720] (unitless, interpreted as px)
     * - Array of strings with units: ['50vw', '100vw', '500px'] (mixed px and vw units)
     * - Object with breakpoint keys: {base: 100, sm: 360, md: 720} (unitless, interpreted as px)
     * - Object with breakpoint keys and units: {base: '100vw', sm: '50vw', md: '500px'}
     */
    widths?: (number | string)[] | Record<string, number> | Record<string, string> | Record<string, number | string>;
    formats?: Array<DynamicImageFormat>;
    breakpoints?: Record<string, string>;
    /**
     * Image quality (1-100). If the source URL already contains a `q` parameter,
     * that value takes priority over this setting.
     */
    quality?: number;
}): {
    sources: Source[];
    links: ConvertedImageLink[];
    src: string;
} => {
    if (!widths) {
        return {
            sources: [],
            links: [],
            src: getSrcWithoutOptionalParams(src),
        };
    }

    if (breakpoints !== themeBreakpoints) {
        themeBreakpoints = breakpoints as typeof defaultBreakpoints;
        breakpointLabels = getBreakpointLabels(themeBreakpoints);
    }

    const _widths = isObject(widths)
        ? widthsAsArray(widths as Record<string, number | string>)
        : (widths as (number | string)[]).slice(0);
    const { sources, links } = getResponsiveSourcesAndLinks(src, {
        widths: _widths,
        formats,
        quality,
    });

    return {
        sources,
        links,
        src: getSrcWithoutOptionalParams(src),
    };
};
