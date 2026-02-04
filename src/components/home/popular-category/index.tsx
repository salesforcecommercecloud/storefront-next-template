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
import type { ComponentProps } from 'react';
import type { ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import ContentCard from '@/components/content-card';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { useTranslation } from 'react-i18next';
import heroImage from '/images/hero-cube.webp';
import { loader as loaders } from './loaders';

interface PopularCategoryProps extends ComponentProps<'div'> {
    // Category data from Page Designer (via loader) or programmatic use
    category?: ShopperProducts.schemas['Category'];
    // Page Designer props (passed by Component wrapper, must be extracted to avoid passing to DOM)
    regionId?: string;
    page?: ShopperExperience.schemas['Page'];
    component?: ShopperExperience.schemas['Component'];
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    // Loader data - full category object fetched by loader
    data?: ShopperProducts.schemas['Category'];
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('popularCategory', {
    name: 'Popular Category',
    description: 'Displays a single category card with image, title, description, and shop now button',
})
export class PopularCategoryMetadata {
    @AttributeDefinition({
        name: 'Category',
        description: 'Select a category to display',
        type: 'category',
    })
    category?: string;
}
/* v8 ignore stop */

/* eslint-disable-next-line react-refresh/only-export-components*/
export const loader = loaders.server;

/**
 * PopularCategory component that displays a single category as a content card
 * Can be used in Page Designer or programmatically
 *
 * When used in Page Designer:
 * - Uses a single 'category' attribute (type: 'category') which stores the category ID
 * - The loader fetches the full category object and passes it via the 'data' prop
 *
 * When used programmatically:
 * - Accepts a full category object via the 'category' prop
 */
export default function PopularCategory({
    category,
    // Page Designer props - extracted to avoid passing to DOM
    regionId: _regionId,
    page: _page,
    component: _component,
    componentData: _componentData,
    designMetadata: _designMetadata,
    // Loader data - full category object fetched by loader
    data,
    ...props
}: PopularCategoryProps) {
    const { t } = useTranslation('home');

    // Use data from loader (Page Designer) or category prop (programmatic use)
    // If category is a string, it's from Page Designer and we should ignore it (wait for loader data)
    // If category is an object, it's programmatic use
    const categoryData = data || (typeof category === 'object' && category !== null ? category : undefined);

    if (!categoryData) {
        // Fallback if no category data is provided
        return (
            <ContentCard
                title=""
                description=""
                imageUrl={heroImage}
                imageAlt=""
                buttonText={t('categoryGrid.shopNowButton')}
                buttonLink="/category/root"
                showBackground={true}
                showBorder={true}
                loading="eager"
                {...props}
            />
        );
    }

    const finalCategoryId = categoryData.id || '';
    const finalName = categoryData.name || '';
    const finalDescription = categoryData.pageDescription || categoryData.description || '';

    // Determine image URL - priority: category image > category banner > hero fallback
    const categoryImageUrl = categoryData.image || categoryData.c_slotBannerImage;
    const finalImageUrl = categoryImageUrl || heroImage;
    const finalImageAlt = categoryData.name || '';

    return (
        <ContentCard
            title={finalName}
            description={finalDescription}
            imageUrl={finalImageUrl as string}
            imageAlt={finalImageAlt}
            buttonText={t('categoryGrid.shopNowButton')}
            buttonLink={`/category/${finalCategoryId}`}
            showBackground={true}
            showBorder={true}
            loading="eager"
            {...props}
        />
    );
}
