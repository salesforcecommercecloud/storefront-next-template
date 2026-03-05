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
'use client';

import { createContext, useContext, useState, type ComponentPropsWithoutRef, type ReactElement } from 'react';
import { NavLink } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import CategoryNavigationMenu, { WithCategoryNavigationMenu } from '@/components/navigation-menu';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toImageUrl } from '@/lib/dynamic-image';
import { useConfig } from '@/config';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

interface MobileMenuContextType {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
    categories: ShopperProducts.schemas['Category'][];
}

const MobileMenuContext = createContext<MobileMenuContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useMobileMenu() {
    return useContext(MobileMenuContext);
}

function hasBanner(category?: ShopperProducts.schemas['Category']): category is ShopperProducts.schemas['Category'] {
    return typeof category?.c_headerMenuBanner === 'string' && category?.c_headerMenuBanner?.length > 0;
}

function isVertical(category?: ShopperProducts.schemas['Category']): category is ShopperProducts.schemas['Category'] {
    return (
        typeof category?.c_headerMenuOrientation === 'string' &&
        category?.c_headerMenuOrientation?.toLowerCase() === 'vertical'
    );
}

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

function hasSubcategories(category: ShopperProducts.schemas['Category']): boolean {
    return (
        typeof category.onlineSubCategoriesCount === 'number' &&
        category.onlineSubCategoriesCount > 0 &&
        Array.isArray(category.categories) &&
        category.categories.length > 0
    );
}

/**
 * MobileMenuDropdown - Renders the mobile menu dropdown content with expandable subcategories
 * Uses absolute positioning (relative to header) to automatically appear below the header
 * regardless of header height changes. No hardcoded values needed.
 */
export function MobileMenuDropdown(): ReactElement | null {
    const context = useMobileMenu();
    const { t } = useTranslation('header');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    if (!context) return null;

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    return (
        <div
            className={cn(
                'lg:hidden absolute left-0 right-0 top-full bg-background border-b border-border shadow-lg z-40 max-h-[70vh] overflow-y-auto',
                { hidden: !context.isOpen }
            )}
            aria-hidden={!context.isOpen}>
            <nav className="px-4 py-4" aria-label={t('mobileNavigation', 'Mobile navigation menu')}>
                <ul className="space-y-1">
                    {context.categories.map((category) => {
                        const colorClass = category.id === 'top-seller' ? '!text-primary' : '';
                        const hasChildren = hasSubcategories(category);
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                            <li key={category.id}>
                                <div className="flex items-center justify-between">
                                    {/* Parent category link */}
                                    <NavLink
                                        to={`/category/${category.id}`}
                                        onClick={context.close}
                                        className={cn(
                                            'flex-1 py-3 text-base font-medium hover:text-primary',
                                            colorClass
                                        )}>
                                        {category.name}
                                    </NavLink>

                                    {/* Expand/collapse button for categories with subcategories */}
                                    {hasChildren && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleCategory(category.id)}
                                            className="ml-2 p-2 h-auto shrink-0"
                                            aria-label={
                                                isExpanded
                                                    ? t('collapseCategory', `Collapse ${category.name}`)
                                                    : t('expandCategory', `Expand ${category.name}`)
                                            }
                                            aria-expanded={isExpanded}>
                                            <ChevronDown
                                                className={cn('size-5 transition-transform duration-200', {
                                                    'rotate-180': isExpanded,
                                                })}
                                            />
                                        </Button>
                                    )}
                                </div>

                                {/* Subcategories list */}
                                {hasChildren && isExpanded && (
                                    <ul className="pl-4 pb-2 space-y-1">
                                        {category.categories?.map((subcategory) => (
                                            <li key={subcategory.id}>
                                                <NavLink
                                                    to={`/category/${subcategory.id}`}
                                                    onClick={context.close}
                                                    className="block py-2 text-sm hover:text-primary">
                                                    {subcategory.name}
                                                </NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}

/**
 * ResponsiveNavigationMenu - A unified responsive navigation component
 *
 * This component uses CSS and Tailwind to adapt the same navigation structure
 * for both mobile and desktop:
 * - On mobile (< 1024px): Hamburger button with expandable vertical menu
 * - On desktop (>= 1024px): Horizontal mega menu with dropdown navigation
 *
 * The component renders a single navigation structure with responsive classes
 * controlling layout, visibility, and interaction patterns. This minimizes DOM bloat
 * while maintaining SSR compatibility.
 *
 * @param props - Component props
 * @param props.resolve - Promise resolving to root categories and first-level subcategories
 * @param props.defer - Promise resolving to deeper subcategory data for prefetch
 * @returns A responsive navigation component with CSS-controlled responsive behavior
 */
export default function ResponsiveNavigationMenu({
    resolve,
    defer,
}: ComponentPropsWithoutRef<typeof WithCategoryNavigationMenu>): ReactElement {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { t } = useTranslation('header');

    const defaultListStyle = {
        width: '100%',
        maxWidth: '100%',
    };

    return (
        <WithCategoryNavigationMenu resolve={resolve} defer={defer}>
            {({ categories }) => {
                const mobileMenuContext: MobileMenuContextType = {
                    isOpen: mobileMenuOpen,
                    toggle: () => setMobileMenuOpen(!mobileMenuOpen),
                    close: () => setMobileMenuOpen(false),
                    categories,
                };

                return (
                    <MobileMenuContext.Provider value={mobileMenuContext}>
                        {/* Mobile: Hamburger button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={mobileMenuContext.toggle}
                            className="lg:hidden"
                            aria-label={mobileMenuOpen ? t('closeMenu', 'Close menu') : t('openMenu', 'Open menu')}
                            aria-expanded={mobileMenuOpen}>
                            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </Button>

                        {/* Desktop: Mega menu (always rendered, hidden on mobile with CSS) */}
                        <div className="hidden lg:flex items-center h-full">
                            <CategoryNavigationMenu
                                categories={categories}
                                propsViewport={() => ({
                                    className: 'rounded-none border-0 border-b border-border shadow-lg',
                                    style: {
                                        position: 'fixed',
                                        top: 'var(--header-height)',
                                        left: 0,
                                        width: '100vw',
                                        maxWidth: '100vw',
                                    },
                                })}
                                propsContentContainer={() => ({
                                    className: '!p-0 !left-auto !right-auto !w-full md:!w-full',
                                })}
                                propsContent={({ category }) => ({
                                    className: cn(
                                        'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
                                        hasBanner(category) &&
                                            (isVertical(category)
                                                ? 'grid md:grid-cols-[1fr_.3fr] items-start'
                                                : 'grid md:grid-cols-[1fr_.6fr] items-start')
                                    ),
                                })}
                                propsList={({ parent, categories: subCategories, level }) => {
                                    if (level === 1) {
                                        if (hasBanner(parent) && isVertical(parent)) {
                                            return {
                                                style: defaultListStyle,
                                                className: 'p-0 -mx-2 -mt-2',
                                            };
                                        }
                                        return {
                                            style: {
                                                ...defaultListStyle,
                                                gridTemplateColumns: `repeat(${subCategories.length}, minmax(0, 1fr))`,
                                            },
                                            className: 'grid p-0 -mx-2 -mt-2',
                                        };
                                    }
                                }}
                                propsElement={({ category, level }) => {
                                    const colorClass =
                                        level === 0 && category.id === 'top-seller' ? 'text-primary' : '';
                                    const sizeClass = 'text-sm font-medium';
                                    return { className: `${colorClass} ${sizeClass}` };
                                }}
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
                        </div>

                        {/* Mobile: Menu dropdown (rendered here to be inside provider) */}
                        <MobileMenuDropdown />
                    </MobileMenuContext.Provider>
                );
            }}
        </WithCategoryNavigationMenu>
    );
}
