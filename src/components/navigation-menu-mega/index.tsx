import type { ComponentPropsWithoutRef } from 'react';
import { NavLink } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { type AppConfig, useConfig } from '@/config';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import CategoryNavigationMenu, { WithCategoryNavigationMenu } from '@/components/navigation-menu';

const disHostName = 'edge.disstg.commercecloud.salesforce.com';
const imageCache = new WeakMap<ShopperProducts.schemas['Category'], string | undefined>();

function hasBanner(category?: ShopperProducts.schemas['Category']): category is ShopperProducts.schemas['Category'] {
    return category?.c_headerMenuBanner?.length > 0;
}

function isVertical(category?: ShopperProducts.schemas['Category']): category is ShopperProducts.schemas['Category'] {
    return category?.c_headerMenuOrientation?.toLowerCase() === 'vertical';
}

function getImageHref(category: ShopperProducts.schemas['Category'], config: AppConfig): string | undefined {
    // Luckily when this gets called, we're always in the browser and can use the `DOMParser`, if available
    if (!imageCache.has(category) && 'DOMParser' in globalThis) {
        const organizationId = config.commerce.api.organizationId;
        const realmId = organizationId.split('_').slice(-2).join('_');
        const disHost = `https://${disHostName}/dw/image/v2/${realmId}`;
        const asset = category.c_headerMenuBanner?.trim?.() || '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(asset, 'text/html');
        const img = doc.querySelector('img');
        const src = img?.getAttribute('src') ?? undefined;
        const srcHost = src ? new URL(src) : undefined;
        if (srcHost?.hostname !== disHostName) {
            const srcPath = srcHost?.pathname ?? undefined;
            imageCache.set(category, srcPath ? `${disHost}${srcPath}?sw=640&q=60` : undefined);
        } else {
            imageCache.set(category, src);
        }
    }
    return imageCache.get(category);
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
    const appConfig = useConfig();
    const imageSrc = getImageHref(category, appConfig);

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
        <div className="hidden lg:block">
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
