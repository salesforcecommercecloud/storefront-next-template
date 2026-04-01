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
import { type ElementType, type ImgHTMLAttributes, useMemo } from 'react';
import { preload } from 'react-dom';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { cn, isServer } from '@/lib/utils';
import {
    defaultImageFormats,
    type DynamicImageWidths,
    getResponsivePictureAttributes,
    replaceImageFormat,
    toImageUrl,
} from '@/lib/dynamic-image';
import { useDynamicImageContext } from '@/providers/dynamic-image';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import type { ComponentType } from '@/components/region';

interface DynamicImageProps {
    src: string;
    alt?: string;
    /**
     * Image widths relative to the breakpoints. Supports multiple formats:
     * - Array of numbers: [100, 360, 720] (unitless, interpreted as px)
     * - Array of strings with units: ['50vw', '100vw', '500px'] (mixed px and vw units)
     * - Object with breakpoint keys: {base: 100, sm: 360, md: 720} (unitless, interpreted as px)
     * - Object with breakpoint keys and units: {base: '100vw', sm: '50vw', md: '500px'}
     * - String (for Page Designer): comma-separated widths (e.g., "400,800,1200")
     */
    widths?: DynamicImageWidths | string;
    imageProps?: ImgHTMLAttributes<HTMLImageElement>;
    as?: ElementType;
    className?: string;
    loading?: HTMLImageElement['loading'];
    priority?: HTMLImageElement['fetchPriority'];
    // Page Designer styling props
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    padding?: '0' | '1' | '2' | '3' | '4' | '6' | '8';
    margin?: '0' | '1' | '2' | '3' | '4' | '6' | '8';
    hoverEffect?: 'none' | 'scale' | 'opacity' | 'shadow' | 'brightness';
    // Page Designer props (need to be extracted to avoid passing to DOM)
    regionId?: string;
    component?: ComponentType;
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('pdImage', {
    name: 'Image',
    description: 'Responsive image component with Dynamic Imaging Service support and customizable styling',
})
@RegionDefinition([])
export class DynamicImageMetadata {
    @AttributeDefinition({
        id: 'src',
        name: 'Image URL',
        description: 'The source URL of the image',
        type: 'image',
        required: true,
    })
    src?: string;

    @AttributeDefinition({
        id: 'alt',
        name: 'Alt Text',
        description: 'Alternative text for the image (accessibility)',
        type: 'string',
    })
    alt?: string;

    @AttributeDefinition({
        id: 'widths',
        name: 'Responsive Widths',
        description: 'Comma-separated widths in pixels (e.g., "400,800,1200")',
        type: 'string',
    })
    widths?: string;

    @AttributeDefinition({
        id: 'objectFit',
        name: 'Object Fit',
        description: 'How the image should be resized to fit its container',
        type: 'enum',
        values: ['contain', 'cover', 'fill', 'none', 'scale-down'],
        defaultValue: 'cover',
    })
    objectFit?: string;

    @AttributeDefinition({
        id: 'borderRadius',
        name: 'Border Radius',
        description: 'Corner roundness of the image',
        type: 'enum',
        values: ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'],
        defaultValue: 'none',
    })
    borderRadius?: string;

    @AttributeDefinition({
        id: 'boxShadow',
        name: 'Box Shadow',
        description: 'Shadow effect for the image',
        type: 'enum',
        values: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
        defaultValue: 'none',
    })
    boxShadow?: string;

    @AttributeDefinition({
        id: 'padding',
        name: 'Padding',
        description: 'Padding around the image in Tailwind spacing units',
        type: 'enum',
        values: ['0', '1', '2', '3', '4', '6', '8'],
        defaultValue: '0',
    })
    padding?: string;

    @AttributeDefinition({
        id: 'margin',
        name: 'Margin',
        description: 'Margin around the image in Tailwind spacing units',
        type: 'enum',
        values: ['0', '1', '2', '3', '4', '6', '8'],
        defaultValue: '0',
    })
    margin?: string;

    @AttributeDefinition({
        id: 'hoverEffect',
        name: 'Hover Effect',
        description: 'Interactive hover effect for the image',
        type: 'enum',
        values: ['none', 'scale', 'opacity', 'shadow', 'brightness'],
        defaultValue: 'none',
    })
    hoverEffect?: string;

    @AttributeDefinition({
        id: 'priority',
        name: 'Loading Priority',
        description: 'Priority hint for image loading',
        type: 'enum',
        values: ['high', 'low', 'auto'],
        defaultValue: 'auto',
    })
    priority?: string;
}
/* v8 ignore stop */

// Helper function to map attribute values to Tailwind classes
const getImageStyleClasses = ({
    borderRadius,
    boxShadow,
    padding,
    margin,
    hoverEffect,
}: Partial<DynamicImageProps>) => {
    const classes: string[] = [];

    // Border radius (with overflow-hidden for proper clipping)
    if (borderRadius && borderRadius !== 'none') {
        const radiusMap = {
            sm: 'rounded-sm',
            md: 'rounded-md',
            lg: 'rounded-lg',
            xl: 'rounded-xl',
            '2xl': 'rounded-2xl',
            full: 'rounded-full',
        };
        classes.push(radiusMap[borderRadius]);
        classes.push('overflow-hidden'); // Only add when border radius is applied
    }

    // Box shadow
    if (boxShadow && boxShadow !== 'none') {
        const shadowMap = {
            sm: 'shadow-sm',
            md: 'shadow-md',
            lg: 'shadow-lg',
            xl: 'shadow-xl',
            '2xl': 'shadow-2xl',
        };
        classes.push(shadowMap[boxShadow]);
    }

    // Padding
    if (padding && padding !== '0') {
        classes.push(`p-${padding}`);
    }

    // Margin
    if (margin && margin !== '0') {
        classes.push(`m-${margin}`);
    }

    // Hover effects
    if (hoverEffect && hoverEffect !== 'none') {
        const hoverMap = {
            scale: 'hover:scale-105 transition-transform',
            opacity: 'hover:opacity-90 transition-opacity',
            shadow: 'hover:shadow-lg transition-shadow',
            brightness: 'hover:brightness-110 transition-all',
        };
        classes.push(hoverMap[hoverEffect]);
    }

    return classes.join(' ');
};

// Helper function to get object-fit class for the img element
const getObjectFitClass = (objectFit?: string) => {
    if (!objectFit || objectFit === 'cover') return 'object-cover';

    const objectFitMap: Record<string, string> = {
        contain: 'object-contain',
        fill: 'object-fill',
        none: 'object-none',
        'scale-down': 'object-scale-down',
    };
    return objectFitMap[objectFit] || 'object-cover';
};

// Helper function to parse widths string to array for Page Designer
const parseWidthsString = (widths?: string | DynamicImageWidths): DynamicImageWidths | undefined => {
    if (!widths || typeof widths !== 'string') return widths as DynamicImageWidths | undefined;
    if (widths.trim() === '') return undefined;

    const parsed = widths
        .split(',')
        .map((w) => parseInt(w.trim(), 10))
        .filter((w) => !isNaN(w));
    return parsed.length > 0 ? parsed : undefined;
};

/**
 * Responsive image component optimized to work with the Dynamic Imaging Service.
 * Via this component it's easy to create a `<picture>` element with related
 * theme-aware `<source>` elements and responsive preloading for high-priority
 * images using React 19's `preload` function.
 * @example Widths without a unit defined as array (interpreted as px values)
 * <DynamicImage
 *   src="http://example.com/image.jpg[?sw={width}&q=60]"
 *   widths={[100, 360, 720]} />
 * @example Widths without a unit defined as object (interpreted as px values)
 * <DynamicImage
 *   src="http://example.com/image.jpg[?sw={width}&q=60]"
 *   widths={{base: 100, sm: 360, md: 720}} />
 * @example Widths with mixed px and vw units defined as array
 * <DynamicImage
 *   src="http://example.com/image.jpg[?sw={width}&q=60]"
 *   widths={['50vw', '100vw', '500px']} />
 * @example Eagerly load image with high priority and responsive preloading
 * <DynamicImage
 *   src="http://example.com/image.jpg[?sw={width}&q=60]"
 *   widths={['50vw', '50vw', '20vw', '20vw', '25vw']}
 *   imageProps={{loading: 'eager'}}
 *   />
 * @example Preload all picture sources using React 19's preload function
 * <DynamicImage
 *   src="http://example.com/image.jpg[?sw={width}&q=60]"
 *   widths={[400, 800, 1200]}
 *   priority="high"
 *   />
 * @see {@link https://web.dev/learn/design/responsive-images}
 * @see {@link https://web.dev/learn/design/picture-element}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images}
 * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_image_transformation_service.htm&type=5}
 * @see {@link https://react.dev/reference/react-dom/preload}
 */
const DynamicImage = ({
    src,
    alt = '',
    widths,
    imageProps = {},
    as: ImageComponent = 'img',
    className,
    loading,
    priority,
    objectFit = 'cover',
    borderRadius = 'none',
    boxShadow = 'none',
    padding = '0',
    margin = '0',
    hoverEffect = 'none',
    regionId: _regionId,
    component: _component,
    componentData: _componentData,
    designMetadata: _designMetadata,
    data: _data,
    ...rest
}: DynamicImageProps) => {
    const config = useConfig<AppConfig>();
    const {
        images: {
            quality: defaultQuality = 70,
            formats: configFormats = defaultImageFormats,
            fallbackFormat: defaultFallbackFormat = 'jpg',
            enableDis = true,
        } = {},
    } = config;

    // Page Designer passes image-type attributes as objects — normalize to a plain string.
    // SFCC image objects can use several URL properties depending on source and context.
    const resolvedSrc =
        src && typeof src === 'object'
            ? ((src as Record<string, unknown>).absURL as string) ||
              ((src as Record<string, unknown>).url as string) ||
              ((src as Record<string, unknown>).disBaseLink as string) ||
              ((src as Record<string, unknown>).link as string) ||
              ''
            : (src ?? '');

    // Parse widths if it's a string (from Page Designer)
    const parsedWidths = useMemo(() => parseWidthsString(widths), [widths]);

    // When DIS is disabled, transform the source URL to relative static paths
    // and skip all DIS-dependent behavior (format conversion, responsive <source> generation).
    const transformedSrc = useMemo(() => {
        if (enableDis) return resolvedSrc;
        return toImageUrl({ src: resolvedSrc, config }) || resolvedSrc;
    }, [resolvedSrc, config, enableDis]);

    // When DIS is disabled, use empty formats to skip <source> generation and format conversion.
    // Without DIS, format conversion (webp/avif) and server-side resizing are not available.
    const effectiveFormats = useMemo(() => (enableDis ? configFormats : []), [enableDis, configFormats]);

    const responsiveImageProps = useMemo(() => {
        return getResponsivePictureAttributes({
            src: transformedSrc,
            widths: parsedWidths,
            quality: enableDis ? defaultQuality : undefined,
            formats: effectiveFormats,
        });
    }, [transformedSrc, parsedWidths, defaultQuality, effectiveFormats, enableDis]);
    const imageContext = useDynamicImageContext();

    const effectivePriority = priority ?? (imageContext?.hasSource(transformedSrc) ? 'high' : 'auto');
    const effectiveLoading = loading ?? (effectivePriority === 'high' ? 'eager' : 'lazy');

    // Apply object-fit to imageProps
    const objectFitClass = getObjectFitClass(objectFit);
    const effectiveImageProps = {
        ...imageProps,
        className: cn(objectFitClass, imageProps.className),
        loading: effectiveLoading,
        fetchPriority: effectivePriority,
        alt,
        src: enableDis ? replaceImageFormat(responsiveImageProps.src, defaultFallbackFormat) : responsiveImageProps.src,
    };

    // Get styling classes from Page Designer props
    const styleClasses = getImageStyleClasses({
        borderRadius,
        boxShadow,
        padding,
        margin,
        hoverEffect,
    });

    if (isServer() && effectivePriority === 'high') {
        responsiveImageProps.links.forEach(({ type, media, sizes, srcSet }) => {
            preload(srcSet, {
                as: 'image',
                fetchPriority: 'high',
                imageSrcSet: srcSet,
                imageSizes: sizes,
                type,
                media,
            });
        });
    }

    return (
        <>
            <div className={cn(styleClasses, className)} {...rest}>
                {responsiveImageProps.sources.length > 0 ? (
                    <picture>
                        {responsiveImageProps.sources.map(({ type, srcSet, sizes, media }, idx) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <source key={idx} type={type} {...(media && { media })} sizes={sizes} srcSet={srcSet} />
                        ))}
                        <ImageComponent {...effectiveImageProps} />
                    </picture>
                ) : (
                    <ImageComponent {...effectiveImageProps} />
                )}
            </div>
        </>
    );
};

DynamicImage.displayName = 'DynamicImage';

export { DynamicImage };
export default DynamicImage;
