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
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { Skeleton } from '@/components/ui/skeleton';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';
import { useTranslation } from 'react-i18next';
import { loader as loaders } from './loaders';
import PopularCategory from '@/components/home/popular-category';
import { type ComponentType, Region } from '@/components/region';
import { CategoryScrollContainer } from './scroll-container';

interface PopularCategoriesProps {
    categoriesPromise?: Promise<ShopperProducts.schemas['Category'][]>;
    parentId?: string;
    paddingX?: string;
    // Data prop provided by the Page Designer component loader
    data?: ShopperProducts.schemas['Category'][];
    // Page Designer props
    component?: ComponentType;
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('popularCategories', {
    name: 'Popular Categories',
    description:
        'Displays a scrollable row of popular category cards with images, titles, descriptions, and shop now buttons',
})
@RegionDefinition([
    {
        id: 'categories',
        name: 'Categories',
        description: 'Add Popular Category components to display in the scrollable row',
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
 * Skeleton for individual category cards in the scroll container
 */
function CategoryCardsSkeleton() {
    return (
        <div className="flex gap-4 md:gap-6 overflow-hidden">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px]">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                </div>
            ))}
        </div>
    );
}

/**
 * Title and description header for the category section
 */
function CategorySectionHeader() {
    const { t } = useTranslation('home');
    return (
        <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground mb-4 tracking-tight">
                {t('categoryGrid.title')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {t('categoryGrid.description')}
            </p>
        </div>
    );
}

/**
 * Renders category cards as direct children (for use inside scroll container)
 */
function CategoryCards({ categories }: { categories: ShopperProducts.schemas['Category'][] }) {
    return (
        <>
            {categories.map((category) => (
                <PopularCategory key={category.id} category={category} />
            ))}
        </>
    );
}

/**
 * Content component that renders the category scroll section
 * Handles prioritization: Page Designer mode > data > categoriesPromise
 */
function CategoryGridContent({
    data,
    categoriesPromise,
    component,
}: {
    data?: ShopperProducts.schemas['Category'][];
    categoriesPromise?: Promise<ShopperProducts.schemas['Category'][]>;
    component?: ComponentType;
}) {
    // If component is not provided, show fallback categories
    if (!component) {
        if (data && Array.isArray(data) && data.length > 0) {
            return (
                <>
                    <CategorySectionHeader />
                    <CategoryScrollContainer ariaLabel="Step into Elegance">
                        <CategoryCards categories={data} />
                    </CategoryScrollContainer>
                </>
            );
        }

        if (categoriesPromise) {
            return (
                <>
                    <CategorySectionHeader />
                    <Suspense fallback={<CategoryCardsSkeleton />}>
                        <Await resolve={categoriesPromise} errorElement={null}>
                            {(categories) => (
                                <CategoryScrollContainer ariaLabel="Step into Elegance">
                                    <CategoryCards categories={categories} />
                                </CategoryScrollContainer>
                            )}
                        </Await>
                    </Suspense>
                </>
            );
        }

        return null;
    }

    const hasRegions = component.regions && component.regions.length > 0;

    // Show fallback categories if no regions (page exists but is empty)
    if (!hasRegions) {
        if (data && Array.isArray(data) && data.length > 0) {
            return (
                <CategoryScrollContainer ariaLabel="Step into Elegance">
                    <CategoryCards categories={data} />
                </CategoryScrollContainer>
            );
        }
        if (categoriesPromise) {
            return (
                <Suspense fallback={<CategoryCardsSkeleton />}>
                    <Await resolve={categoriesPromise} errorElement={null}>
                        {(categories) => (
                            <CategoryScrollContainer ariaLabel="Step into Elegance">
                                <CategoryCards categories={categories} />
                            </CategoryScrollContainer>
                        )}
                    </Await>
                </Suspense>
            );
        }
        return null;
    }

    // Regions exist - check if categories region has components
    const categoriesRegion = component.regions?.find((r) => r.id === 'categories');
    const hasComponents = (categoriesRegion?.components?.length ?? 0) > 0;

    // Show fallback categories if no components in categories region
    if (!hasComponents) {
        if (data && Array.isArray(data) && data.length > 0) {
            return (
                <CategoryScrollContainer ariaLabel="Step into Elegance">
                    <CategoryCards categories={data} />
                </CategoryScrollContainer>
            );
        }
        if (categoriesPromise) {
            return (
                <Suspense fallback={<CategoryCardsSkeleton />}>
                    <Await resolve={categoriesPromise} errorElement={null}>
                        {(categories) => (
                            <CategoryScrollContainer ariaLabel="Step into Elegance">
                                <CategoryCards categories={categories} />
                            </CategoryScrollContainer>
                        )}
                    </Await>
                </Suspense>
            );
        }
        return null;
    }

    // Region has components - render them in scroll container
    return (
        <>
            <CategorySectionHeader />
            <CategoryScrollContainer ariaLabel="Step into Elegance">
                <Region regionId="categories" component={component} />
            </CategoryScrollContainer>
        </>
    );
}

/* eslint-disable-next-line react-refresh/only-export-components*/
export const loader = loaders.server;

/**
 * Popular Categories component that displays a scrollable row of category cards
 * with gradient overlay, centered title and description.
 *
 * Can be used in multiple ways:
 * 1. With categoriesPromise - receives pre-fetched categories from route loader
 * 2. With data prop - receives categories from Page Designer component loader
 * 3. With parentId - triggers component loader to fetch categories (used in Page Designer)
 */
export default function PopularCategories({ categoriesPromise, data, component }: PopularCategoriesProps) {
    return (
        <section className="py-12 md:py-16 lg:py-24 bg-muted/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <CategoryGridContent data={data} categoriesPromise={categoriesPromise} component={component} />
            </div>
        </section>
    );
}
