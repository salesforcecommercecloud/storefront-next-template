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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import type { ComponentType } from '@/components/region';

interface PdButtonProps extends ComponentProps<'button'> {
    text?: string;
    link?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    paddingX?: '0' | '1' | '2' | '3' | '4' | '6' | '8';
    paddingY?: '0' | '1' | '2' | '3' | '4' | '6' | '8';
    margin?: '0' | '1' | '2' | '3' | '4' | '6' | '8';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    letterSpacing?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider';
    hoverEffect?: 'default' | 'scale' | 'opacity' | 'shadow';

    // Page Designer props (need to be extracted to avoid passing to DOM)
    regionId?: string;
    component?: ComponentType;
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('pdButton', {
    name: 'Button',
    description: 'Configurable button with customizable styling and hover effects',
})
@RegionDefinition([])
export class PdButtonMetadata {
    @AttributeDefinition({
        id: 'text',
        name: 'Button Text',
        description: 'The text displayed on the button',
        type: 'string',
        required: true,
    })
    text?: string;

    @AttributeDefinition({
        id: 'link',
        name: 'Link URL',
        description: 'The URL to navigate to when the button is clicked',
        type: 'url',
    })
    link?: string;

    @AttributeDefinition({
        id: 'borderRadius',
        name: 'Border Radius',
        description: 'Corner roundness of the button',
        type: 'enum',
        values: ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'],
        defaultValue: 'md',
    })
    borderRadius?: string;

    @AttributeDefinition({
        id: 'boxShadow',
        name: 'Box Shadow',
        description: 'Shadow effect for the button',
        type: 'enum',
        values: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
        defaultValue: 'none',
    })
    boxShadow?: string;

    @AttributeDefinition({
        id: 'paddingX',
        name: 'Horizontal Padding',
        description: 'Left and right padding in Tailwind spacing units',
        type: 'enum',
        values: ['0', '1', '2', '3', '4', '6', '8'],
        defaultValue: '4',
    })
    paddingX?: string;

    @AttributeDefinition({
        id: 'paddingY',
        name: 'Vertical Padding',
        description: 'Top and bottom padding in Tailwind spacing units',
        type: 'enum',
        values: ['0', '1', '2', '3', '4', '6', '8'],
        defaultValue: '2',
    })
    paddingY?: string;

    @AttributeDefinition({
        id: 'margin',
        name: 'Margin',
        description: 'Margin around the button in Tailwind spacing units',
        type: 'enum',
        values: ['0', '1', '2', '3', '4', '6', '8'],
        defaultValue: '0',
    })
    margin?: string;

    @AttributeDefinition({
        id: 'fontWeight',
        name: 'Font Weight',
        description: 'The weight (boldness) of the button text',
        type: 'enum',
        values: ['normal', 'medium', 'semibold', 'bold'],
        defaultValue: 'medium',
    })
    fontWeight?: string;

    @AttributeDefinition({
        id: 'letterSpacing',
        name: 'Letter Spacing',
        description: 'Spacing between letters in the button text',
        type: 'enum',
        values: ['tighter', 'tight', 'normal', 'wide', 'wider'],
        defaultValue: 'normal',
    })
    letterSpacing?: string;

    @AttributeDefinition({
        id: 'hoverEffect',
        name: 'Hover Effect',
        description: 'Interactive hover effect for the button',
        type: 'enum',
        values: ['default', 'scale', 'opacity', 'shadow'],
        defaultValue: 'default',
    })
    hoverEffect?: string;
}
/* v8 ignore stop */

// Helper function to map attribute values to Tailwind classes
const getStyleClasses = ({
    borderRadius,
    boxShadow,
    paddingX,
    paddingY,
    margin,
    fontWeight,
    letterSpacing,
    hoverEffect,
}: Partial<PdButtonProps>) => {
    const classes: string[] = [];

    // Border radius
    if (borderRadius) {
        const radiusMap = {
            none: 'rounded-none',
            sm: 'rounded-sm',
            md: 'rounded-md',
            lg: 'rounded-lg',
            xl: 'rounded-xl',
            '2xl': 'rounded-2xl',
            full: 'rounded-full',
        };
        classes.push(radiusMap[borderRadius]);
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

    // Padding X
    if (paddingX) {
        classes.push(`px-${paddingX}`);
    }

    // Padding Y
    if (paddingY) {
        classes.push(`py-${paddingY}`);
    }

    // Margin
    if (margin && margin !== '0') {
        classes.push(`m-${margin}`);
    }

    // Font weight
    if (fontWeight) {
        const weightMap = {
            normal: 'font-normal',
            medium: 'font-medium',
            semibold: 'font-semibold',
            bold: 'font-bold',
        };
        classes.push(weightMap[fontWeight]);
    }

    // Letter spacing
    if (letterSpacing) {
        const spacingMap = {
            tighter: 'tracking-tighter',
            tight: 'tracking-tight',
            normal: 'tracking-normal',
            wide: 'tracking-wide',
            wider: 'tracking-wider',
        };
        classes.push(spacingMap[letterSpacing]);
    }

    // Hover effects
    if (hoverEffect && hoverEffect !== 'default') {
        const hoverMap = {
            scale: 'hover:scale-105 active:scale-95',
            opacity: 'hover:opacity-90',
            shadow: 'hover:shadow-lg',
        };
        classes.push(hoverMap[hoverEffect]);
    }

    return classes.join(' ');
};

export const PdButton = forwardRef<HTMLButtonElement, PdButtonProps>(
    (
        {
            className,
            text = 'Click me',
            link,
            borderRadius = 'md',
            boxShadow = 'none',
            paddingX = '4',
            paddingY = '2',
            margin = '0',
            fontWeight = 'medium',
            letterSpacing = 'normal',
            hoverEffect = 'default',
            regionId: _regionId,
            component: _component,
            componentData: _componentData,
            designMetadata: _designMetadata,
            data: _data,
            ...props
        },
        ref
    ) => {
        const styleClasses = getStyleClasses({
            borderRadius,
            boxShadow,
            paddingX,
            paddingY,
            margin,
            fontWeight,
            letterSpacing,
            hoverEffect,
        });

        // If there's a link, render as Link component
        if (link) {
            return (
                <Button asChild className={cn(styleClasses, className)}>
                    <Link to={link}>{text}</Link>
                </Button>
            );
        }

        // Otherwise render as regular button
        return (
            <Button ref={ref} className={cn(styleClasses, className)} {...props}>
                {text}
            </Button>
        );
    }
);
PdButton.displayName = 'PdButton';

export default PdButton;
