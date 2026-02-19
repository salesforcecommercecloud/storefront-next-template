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
import { forwardRef, type ComponentProps } from 'react';
import { Link } from 'react-router';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import { cn, resolveAssetUrl } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { type Image } from '@/types';
import type { ComponentType } from '@/components/region';

interface ContentCardProps extends ComponentProps<'div'> {
    title?: string;
    description?: string;
    imageUrl?: Image | string;
    imageAlt?: string;
    buttonText?: string;
    buttonLink?: string;
    showBackground?: boolean;
    showBorder?: boolean;
    loading?: 'lazy' | 'eager';

    // Page Designer props (need to be extracted to avoid passing to DOM)
    regionId?: string;
    component?: ComponentType;
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
    cardFooterClassName?: string;
    cardDescriptionClassName?: string;
    buttonClassName?: string;
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('contentCard', {
    name: 'Content Card',
    description: 'Flexible card component with optional image, title, description, and call-to-action button',
})
export class ContentCardMetadata {
    @AttributeDefinition()
    title?: string;

    @AttributeDefinition()
    description?: string;

    @AttributeDefinition({ type: 'image' })
    imageUrl?: Image;

    @AttributeDefinition()
    imageAlt?: string;

    @AttributeDefinition()
    buttonText?: string;

    @AttributeDefinition()
    buttonLink?: string;

    @AttributeDefinition()
    showBackground?: boolean;

    @AttributeDefinition()
    showBorder?: boolean;
}
/* v8 ignore stop */

export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(
    (
        {
            className,
            cardFooterClassName,
            cardDescriptionClassName,
            buttonClassName,
            title,
            description,
            imageUrl,
            imageAlt,
            buttonText,
            buttonLink,
            showBackground = true,
            showBorder = true,
            loading = 'lazy',
            regionId: _regionId,
            component: _component,
            componentData: _componentData,
            designMetadata: _designMetadata,
            data: _data,
            ...props
        },
        ref
    ) => {
        // Normalize imageUrl to handle both string and Image object
        const imageData = typeof imageUrl === 'string' ? { url: imageUrl } : imageUrl;
        const imageSrc = imageData?.url;

        // Calculate focal point for object-position (defaults to center)
        const focalX = imageData?.focal_point?.x ? `${imageData.focal_point.x}%` : '50%';
        const focalY = imageData?.focal_point?.y ? `${imageData.focal_point.y}%` : '50%';
        const objectPosition = `${focalX} ${focalY}`;

        return (
            <Card
                ref={ref}
                className={cn(
                    'h-full overflow-hidden',
                    showBackground ? 'ring-secondary/40 bg-muted/50' : 'bg-transparent',
                    !showBorder && 'border-0 shadow-none',
                    className
                )}
                {...props}>
                {imageSrc && (
                    <CardContent className="p-0">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary/20">
                            <img
                                src={resolveAssetUrl(imageSrc)}
                                alt={imageAlt || title || ''}
                                className="w-full h-full object-cover"
                                style={{ objectPosition }}
                                loading={loading}
                            />
                        </div>
                    </CardContent>
                )}

                {(title || description || (buttonText && buttonLink)) && (
                    <CardFooter className={cn('flex-col items-start gap-4 p-6 flex-1', cardFooterClassName)}>
                        {(title || description) && (
                            <div className={cn('flex-1', cardDescriptionClassName)}>
                                {title && <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>}
                                {description && (
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">{description}</p>
                                )}
                            </div>
                        )}
                        {buttonText && buttonLink && (
                            <Button asChild className={cn('w-full', buttonClassName)}>
                                <Link to={buttonLink}>{buttonText}</Link>
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>
        );
    }
);
ContentCard.displayName = 'ContentCard';

export default ContentCard;
