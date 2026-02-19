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
import type { ComponentPropsWithoutRef } from 'react';
import { NavLink } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import CategoryNavigationMenu, { WithCategoryNavigationMenu } from '@/components/navigation-menu';
import { toImageUrl } from '@/lib/dynamic-image';
import { useConfig } from '@/config';

function hasBanner(category?: ShopperProducts.schemas['Category']): category is ShopperProducts.schemas['Category'] {
    return typeof category?.c_headerMenuBanner === 'string' && category?.c_headerMenuBanner?.length > 0;
}

function isVertical(category?: ShopperProducts.schemas['Category']): category is ShopperProducts.schemas['Category'] {
    return (
        typeof category?.c_headerMenuOrientation === 'string' &&
        category?.c_headerMenuOrientation?.toLowerCase() === 'vertical'
    );
}

/**
 * This is a demo implementation of a category banner. Our default B2C Commerce demo instance provides specific custom
 * attributes/data already to define the banner content as well as its orientation. Unfortunately, that data is provided
 * in the form of a content asset, i.e., a string of HTML. This implementation uses the {@link DOMParser} to parse the
 * HTML and extract the image URL from it. It then takes the image URL, extracts the `pathname` from it, and uses that
 * information to build a new URL pointing to the Dynamic Imaging Service (DIS), appending scaling and compression
 * query parameters to it as well.
 * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_image_transformation_service.htm}
 */
function CategoryBanner({
    category,
    ...props
}: ComponentPropsWithoutRef<'a'> & { category: ShopperProducts.schemas['Category'] }) {
    const config = useConfig();
    const imageSrc = toImageUrl({ src: (category?.c_slotBannerImage as string) ?? '', config });

    return (
        <NavigationMenuLink asChild>
            <NavLink {...props} to={`/category/${category.id}`}>
                {imageSrc ? (
                    <img
                        className="object-contain w-full max-w-full max-h-[512px]"
                        src={imageSrc}
                        alt={category.name}
                    />
                ) : (
                    // eslint-disable-next-line react/no-danger
                    <div className="ml-auto" dangerouslySetInnerHTML={{ __html: category.c_headerMenuBanner || '' }} />
                )}
            </NavLink>
        </NavigationMenuLink>
    );
}

/**
 * The implementation of a mega menu using the generic navigation menu component.
 *
 * **Note:** This component is right now considered to be an example as the final UX is likely to change a little.
 */
export default function CategoryNavigationMenuMega({
    resolve,
    defer,
}: ComponentPropsWithoutRef<typeof WithCategoryNavigationMenu>) {
    const defaultListStyle = {
        width: '100%',
        maxWidth: '100%',
    };

    return (
        <div className="hidden lg:block h-10">
            <WithCategoryNavigationMenu resolve={resolve} defer={defer}>
                {({ categories }) => (
                    <CategoryNavigationMenu
                        categories={categories}
                        className="mx-auto max-w-7xl px-4"
                        // We need to override the viewport's `style` property in order to impact its final display/
                        // positioning.  The reason for this is that shadcn/ui's viewport component creates an
                        // uncustomizable wrapper around Radix's underlying viewport component, so we need to use
                        // element-level styles to gain higher specificity.
                        propsViewport={() => ({
                            style: {
                                position: 'fixed',
                                left: 0,
                                width: '100vw',
                                maxWidth: '100vw',
                            },
                        })}
                        propsContentContainer={() => ({
                            style: {
                                width: '90vw',
                                maxWidth: '90vw',
                                marginLeft: '5vw',
                            },
                        })}
                        propsContent={({ category }) => ({
                            className: hasBanner(category)
                                ? isVertical(category)
                                    ? 'grid md:grid-cols-[1fr_.3fr] items-start divide-x'
                                    : 'grid md:grid-cols-[1fr_.6fr] items-start divide-x'
                                : undefined,
                        })}
                        propsList={({ parent, categories: subCategories, level }) => {
                            if (level === 1) {
                                if (hasBanner(parent) && isVertical(parent)) {
                                    return {
                                        style: defaultListStyle,
                                    };
                                }
                                return {
                                    style: defaultListStyle,
                                    className: `grid grid-cols-${subCategories.length}`,
                                };
                            }
                        }}
                        // Showcase styling the "top-seller" category with primary color
                        propsElement={({ category, level }) => ({
                            className: `${level === 0 && category.id === 'top-seller' ? 'text-primary' : ''} text-base ${level <= 1 ? 'font-bold' : 'font-medium'}`,
                        })}
                        renderSlotListAfter={({ level, parent }) => {
                            if (level === 1 && hasBanner(parent)) {
                                return (
                                    <aside className="self-stretch">
                                        <CategoryBanner category={parent} />
                                    </aside>
                                );
                            }
                        }}
                    />
                )}
            </WithCategoryNavigationMenu>
        </div>
    );
}
