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
