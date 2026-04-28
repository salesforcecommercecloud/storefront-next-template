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
import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ComponentPropsWithoutRef,
    type ReactElement,
} from 'react';
import { NavLink } from '@/components/link';
import { useNavigate } from '@/hooks/use-navigate';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import CategoryNavigationMenu, { WithCategoryNavigationMenu } from '@/components/navigation-menu';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toImageUrl, transformHtmlImageUrls } from '@/lib/dynamic-image';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
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
    // Default to vertical if not set
    if (!category?.c_headerMenuOrientation) {
        return true;
    }
    // Only horizontal if explicitly set to "horizontal"
    return String(category.c_headerMenuOrientation).toLowerCase() !== 'horizontal';
}

function CategoryBanner({
    category,
    ...props
}: ComponentPropsWithoutRef<'a'> & { category: ShopperProducts.schemas['Category'] }) {
    const config = useConfig<AppConfig>();
    const imageSrc = toImageUrl({ src: (category?.c_slotBannerImage as string) ?? '', config });

    // Transform any image URLs in the HTML banner to use DIS with WebP optimization
    const transformedBannerHtml = transformHtmlImageUrls((category.c_headerMenuBanner as string) || '', config);

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
                    <div className="ml-auto" dangerouslySetInnerHTML={{ __html: transformedBannerHtml }} />
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
                'lg:hidden absolute left-0 right-0 top-full bg-header-background text-header-foreground border-b border-border shadow-lg z-40 max-h-[70vh] overflow-y-auto',
                { hidden: !context.isOpen }
            )}
            aria-hidden={!context.isOpen}>
            <nav className="px-4 py-4" aria-label={t('mobileNavigation', 'Mobile navigation menu')}>
                <ul className="space-y-1">
                    {context.categories.map((category) => {
                        const hasChildren = hasSubcategories(category);
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                            <li key={category.id}>
                                <div className="flex items-center justify-between">
                                    {/* Parent category link */}
                                    <NavLink
                                        to={`/category/${category.id}`}
                                        onClick={context.close}
                                        className="flex-1 py-3 text-base font-medium hover:opacity-70 transition-opacity">
                                        {category.name}
                                    </NavLink>

                                    {/* Expand/collapse button for categories with subcategories */}
                                    {hasChildren && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleCategory(category.id)}
                                            className="ml-2 p-2 h-auto shrink-0 hover:bg-transparent hover:opacity-50 transition-opacity"
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
                                                    className="block py-2 text-sm hover:opacity-70 transition-opacity">
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
    const navigate = useNavigate();

    const defaultListStyle = {
        width: '100%',
        maxWidth: '100%',
    };

    // Handler for top-level category clicks
    const handleTopLevelClick = useCallback(
        (categoryId: string) => {
            void navigate(`/category/${categoryId}`);
        },
        [navigate]
    );

    // Element props generator
    const getElementProps = useCallback(
        ({
            level,
            category,
            isLeaf,
        }: {
            level: number;
            category: ShopperProducts.schemas['Category'];
            isLeaf?: boolean;
        }) => {
            const isSubcategory = level >= 1;
            const isClickableParent = level === 0 && !isLeaf && category.id;

            return {
                className: cn(
                    'text-sm font-medium',
                    isSubcategory &&
                        'hover:!bg-transparent focus:!bg-transparent hover:!text-header-menu-foreground/60 focus:!text-header-menu-foreground/60 transition-colors'
                ),
                ...(isClickableParent && {
                    // Use onPointerDown instead of onClick for mouse-only navigation.
                    // This preserves keyboard accessibility: Enter/Space on the trigger
                    // expands the dropdown (Radix behavior), while mouse clicks navigate
                    // to the category page. Without this guard, keyboard users would be
                    // forced to navigate without being able to explore subcategories.
                    onPointerDown: (e: React.PointerEvent) => {
                        if (e.pointerType === 'mouse') {
                            handleTopLevelClick(category.id);
                        }
                    },
                }),
            };
        },
        [handleTopLevelClick]
    );

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
                            className="lg:hidden hover:bg-transparent hover:opacity-50 transition-opacity"
                            aria-label={mobileMenuOpen ? t('closeMenu', 'Close menu') : t('openMenu', 'Open menu')}
                            aria-expanded={mobileMenuOpen}>
                            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </Button>

                        {/* Desktop: Mega menu (always rendered, hidden on mobile with CSS) */}
                        <div className="hidden lg:flex items-center h-full">
                            <CategoryNavigationMenu
                                categories={categories}
                                delayDuration={0}
                                propsViewport={() => ({
                                    className:
                                        'rounded-none border-0 border-b border-border shadow-lg [&[data-state=open]]:animate-[menuSlideDown_0.15s_ease-in] [&[data-state=closed]]:animate-none will-change-transform',
                                    style: {
                                        position: 'fixed',
                                        top: 'var(--header-height)',
                                        left: 0,
                                        width: '100vw',
                                        maxWidth: '100vw',
                                        // Subtle elevation tint: overlay the foreground color at low alpha on top of
                                        // the menu background. This creates a one-step-lighter surface on dark themes
                                        // and one-step-darker surface on light themes — automatically adapting to any
                                        // theme (e.g. green header → tinted-green dropdown) without new tokens.
                                        backgroundImage:
                                            'linear-gradient(color-mix(in oklab, var(--header-menu-foreground) 5%, transparent), color-mix(in oklab, var(--header-menu-foreground) 5%, transparent))',
                                    },
                                })}
                                propsContentContainer={() => ({
                                    className:
                                        '!p-0 !left-auto !right-auto !w-full md:!w-full !animate-none !transition-none',
                                })}
                                propsContent={({ category }) => ({
                                    className: cn(
                                        'section-container pb-6',
                                        hasBanner(category) &&
                                            (isVertical(category)
                                                ? 'grid md:grid-cols-[1fr_.3fr] items-start'
                                                : 'grid md:grid-cols-[1fr_.6fr] items-start')
                                    ),
                                })}
                                propsList={({ parent, categories: subCategories, level }) => {
                                    if (level === 1) {
                                        if (isVertical(parent)) {
                                            return {
                                                style: defaultListStyle,
                                                className: 'flex flex-col gap-0 p-0',
                                            };
                                        }
                                        return {
                                            style: {
                                                ...defaultListStyle,
                                                gridTemplateColumns: `repeat(${subCategories.length}, minmax(0, 1fr))`,
                                            },
                                            className: 'grid p-0',
                                        };
                                    }
                                }}
                                propsElement={getElementProps}
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
