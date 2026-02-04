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
import { Suspense } from 'react';
import { Await } from 'react-router';
import type { ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/typography';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';
import { useTranslation } from 'react-i18next';
import { loader as loaders } from './loaders';
import PopularCategory from '@/components/home/popular-category';
import { Region } from '@/components/region';

interface PopularCategoriesProps {
    categoriesPromise?: Promise<ShopperProducts.schemas['Category'][]>;
    parentId?: string;
    paddingX?: string;
    // Data prop provided by the Page Designer component loader
    data?: ShopperProducts.schemas['Category'][];
    // Page Designer props
    component?: ShopperExperience.schemas['Component'];
    componentData?: Record<string, Promise<unknown>>;
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('popularCategories', {
    name: 'Popular Categories',
    description: 'Displays a grid of popular category cards with images, titles, descriptions, and shop now buttons',
})
@RegionDefinition([
    {
        id: 'categories',
        name: 'Categories',
        description: 'Add Popular Category components to display in the grid',
        maxComponents: 4,
    },
])
export class PopularCategoriesMetadata {
    @AttributeDefinition({
        name: 'Parent Category ID',
        description: 'The parent category ID to fetch child categories from (e.g., root, mens, womens)',
    })
    parentId?: string;

    @AttributeDefinition({
        name: 'Horizontal Padding',
        description: 'Horizontal padding classes (e.g., px-4 sm:px-6 lg:px-8)',
    })
    paddingX?: string;
}
/* v8 ignore stop */

/**
 * Skeleton component for category grid loading state
 */
function CategoryGridSkeleton({ paddingX = 'px-4 sm:px-6 lg:px-8' }: { paddingX?: string }) {
    return (
        <div className="w-full">
            <div className={`text-center mb-8 ${paddingX}`}>
                <Skeleton className="h-10 w-64 mx-auto" />
            </div>
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${paddingX}`}>
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Helper function to calculate grid configuration based on component/category count
 */
function calculateGridConfig(count: number) {
    const componentCount = Math.min(Math.max(count || 4, 1), 4);
    const gridCols = componentCount === 1 ? 'minmax(0, 1fr)' : `repeat(${componentCount}, minmax(0, 1fr))`;

    return {
        componentCount,
        gridCols,
        className: `grid grid-cols-2 gap-4 sm:gap-6 ${componentCount === 1 ? 'lg:grid-cols-[minmax(0,400px)] lg:justify-center' : 'lg:grid-cols-[var(--grid-cols)]'}`,
        style:
            componentCount > 1
                ? ({
                      '--grid-cols': gridCols,
                  } as React.CSSProperties)
                : undefined,
    };
}

/**
 * Title component for category grid
 */
function CategoryGridTitle() {
    const { t } = useTranslation('home');
    return (
        <div className="text-center mb-8">
            <Typography variant="h2" align="center" className="text-3xl font-extrabold text-foreground sm:text-4xl">
                {t('categoryGrid.title')}
            </Typography>
        </div>
    );
}

/**
 * Helper function to render fallback categories from data or categoriesPromise
 */
function renderFallbackCategories(
    data?: ShopperProducts.schemas['Category'][],
    categoriesPromise?: Promise<ShopperProducts.schemas['Category'][]>,
    paddingX?: string
) {
    // Only use data if it has actual categories (not empty array)
    if (data && Array.isArray(data) && data.length > 0) {
        const displayCategories = data.slice(0, 4);
        const fallbackCount = Math.min(Math.max(displayCategories.length || 4, 1), 4);
        const fallbackGridConfig = calculateGridConfig(fallbackCount);
        return (
            <div className={fallbackGridConfig.className} style={fallbackGridConfig.style}>
                {displayCategories.map((category) => (
                    <PopularCategory key={category.id} category={category} />
                ))}
            </div>
        );
    }

    // Use categoriesPromise if data is not available or empty
    if (categoriesPromise) {
        return (
            <Suspense fallback={<CategoryGridSkeleton paddingX={paddingX} />}>
                <Await
                    resolve={categoriesPromise}
                    errorElement={null} // If API fails, gracefully return null instead of breaking the page
                >
                    {(categories) => {
                        const displayCategories = categories.slice(0, 4);
                        const fallbackCount = Math.min(Math.max(displayCategories.length || 4, 1), 4);
                        const fallbackGridConfig = calculateGridConfig(fallbackCount);
                        return (
                            <div className={fallbackGridConfig.className} style={fallbackGridConfig.style}>
                                {displayCategories.map((category) => (
                                    <PopularCategory key={category.id} category={category} />
                                ))}
                            </div>
                        );
                    }}
                </Await>
            </Suspense>
        );
    }
    return null;
}

/**
 * Content component that renders the category grid
 * Handles prioritization: Page Designer mode > data > categoriesPromise
 */
function CategoryGridContent({
    data,
    categoriesPromise,
    component,
    componentData,
    paddingX,
}: {
    data?: ShopperProducts.schemas['Category'][];
    categoriesPromise?: Promise<ShopperProducts.schemas['Category'][]>;
    component?: ShopperExperience.schemas['Component'];
    componentData?: Record<string, Promise<unknown>>;
    paddingX?: string;
}) {
    // If component or componentData are not provided, show fallback categories
    if (!component || !componentData) {
        return (
            <>
                <CategoryGridTitle />
                {renderFallbackCategories(data, categoriesPromise, paddingX)}
            </>
        );
    }

    const hasRegions = component.regions && component.regions.length > 0;

    // Show fallback categories if no regions (page exists but is empty)
    if (!hasRegions) {
        return renderFallbackCategories(data, categoriesPromise, paddingX);
    }

    // Regions exist - check if categories region has components
    const categoriesRegion = component.regions?.find((r) => r.id === 'categories');
    const hasComponents = (categoriesRegion?.components?.length ?? 0) > 0;

    // Show fallback categories if no components in categories region
    if (!hasComponents) {
        return renderFallbackCategories(data, categoriesPromise, paddingX);
    }

    // Region has components - render them
    const componentCount = Math.min(Math.max(categoriesRegion?.components?.length || 4, 1), 4);
    const gridConfig = calculateGridConfig(componentCount);

    return (
        <>
            <CategoryGridTitle />
            <div className={gridConfig.className} style={gridConfig.style}>
                {/* TODO: Refactor <Region/> properties `page` and `componentData` to not expect promises anymore */}
                <Region
                    regionId="categories"
                    page={Promise.resolve(component)}
                    componentData={Promise.resolve(componentData)}
                />
            </div>
        </>
    );
}

/* eslint-disable-next-line react-refresh/only-export-components*/
export const loader = loaders.server;

/**
 * Popular Categories component that displays a grid of category cards
 * Shows the first 4 categories in a responsive grid layout
 *
 * Can be used in multiple ways:
 * 1. With categoriesPromise - receives pre-fetched categories from route loader
 * 2. With data prop - receives categories from Page Designer component loader
 * 3. With parentId - triggers component loader to fetch categories (used in Page Designer)
 */
export default function PopularCategories({
    categoriesPromise,
    data,
    paddingX = 'px-4 sm:px-6 lg:px-8',
    component,
    componentData,
}: PopularCategoriesProps) {
    const content = (
        <CategoryGridContent
            data={data}
            categoriesPromise={categoriesPromise}
            component={component}
            componentData={componentData}
            paddingX={paddingX}
        />
    );

    return (
        <div className="pb-16">
            <div className={`max-w-screen-2xl mx-auto ${paddingX}`}>
                {content || <CategoryGridSkeleton paddingX={paddingX} />}
            </div>
        </div>
    );
}
