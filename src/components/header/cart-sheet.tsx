'use client';

import { type PropsWithChildren, type ReactElement, useState, useEffect } from 'react';
import { Link, useFetcher } from 'react-router';
import { useBasket } from '@/providers/basket';
import { useConfig } from '@/config';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import MiniCartItem from '@/components/cart/mini-cart-item';
import { formatCurrency } from '@/lib/currency';
import { useBasketWithProducts, type BasketItemWithProduct } from '@/hooks/use-basket-with-products';
import { useToast } from '@/components/toast';
import type { ActionResponse } from '@/routes/types/action-responses';
import { useTranslation } from 'react-i18next';

/**
 * Container component for MiniCartItem that handles remove functionality
 * Uses useFetcher to submit remove requests to the cart API
 */
function MiniCartItemContainer({ item, removeAction }: { item: BasketItemWithProduct; removeAction: string }) {
    const fetcher = useFetcher<ActionResponse>();
    const { addToast } = useToast();
    const { t } = useTranslation('removeItem');

    const handleRemove = () => {
        const formData = new FormData();
        formData.append('itemId', item.itemId || '');
        void fetcher.submit(formData, {
            method: 'POST',
            action: removeAction,
        });
    };

    // Show toast notification when item is removed
    useEffect(() => {
        if (fetcher.state === 'idle' && fetcher.data) {
            if (fetcher.data.success) {
                addToast(t('success'), 'success');
            } else {
                addToast(t('failed'), 'error');
            }
        }
        // addToast is stable, no need to include in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetcher.state, fetcher.data, t]);

    return <MiniCartItem product={item} onRemove={handleRemove} />;
}

/**
 * CartSheet (Mini Cart Flyout) - A slide-out panel displaying the shopping cart contents
 *
 * This component renders as a Sheet (slide-out drawer) from the right side of the screen
 * when the user clicks on the cart icon in the header. It provides a quick view of cart
 * contents without navigating away from the current page.
 *
 * Features:
 * - Displays all items currently in the shopping cart with images, prices, and variations
 * - Allows quantity updates and item removal directly from the flyout
 * - Shows order total with checkout button
 * - "Continue Shopping" button to close the flyout
 * - Lazy-loaded for performance (loaded on first cart icon click)
 * - Automatically opens when mounted (used with lazy loading)
 *
 * @param props - Component props
 * @param props.children - The trigger element (typically the cart badge/icon button)
 * @returns A Sheet component wrapping the mini cart UI
 *
 * @example
 * ```tsx
 * <CartSheet>
 *   <Button variant="ghost">
 *     <CartIcon />
 *   </Button>
 * </CartSheet>
 * ```
 */
export default function CartSheet({ children }: PropsWithChildren): ReactElement {
    // As this component gets loaded on demand, it immediately gets displayed open
    const [open, setOpen] = useState<boolean>(true);
    const { t } = useTranslation('header');
    const { t: tMiniCart } = useTranslation('miniCart');
    const basket = useBasket();
    const config = useConfig();

    // Fetch full product details (images, variations, etc.) for basket items
    const { productItems: enrichedProductItems, isLoading } = useBasketWithProducts(basket);

    // Use the same count as the cart badge icon - number of unique products, not total quantity
    const totalItems = basket?.productItems?.length ?? 0;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg flex flex-col p-0" data-testid="mini-cart-flyout">
                {/* Header */}
                <SheetHeader className="px-6 pt-6 pb-4 space-y-0">
                    <SheetTitle className="text-2xl font-bold text-foreground">
                        {t('cartTitle')}
                        {totalItems > 0 && ` (${totalItems})`}
                    </SheetTitle>
                </SheetHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {basket && basket.productItems && basket.productItems.length > 0 ? (
                        <>
                            {/* Top Divider */}
                            <Separator className="bg-muted-foreground/10" />

                            {/* Cart Items */}
                            {isLoading && enrichedProductItems.length === 0 ? (
                                <div className="flex items-center justify-center py-8 px-6">
                                    <p className="text-sm text-muted-foreground">{tMiniCart('loading')}</p>
                                </div>
                            ) : (
                                <div className="py-4 px-6">
                                    {enrichedProductItems.map((item) => (
                                        <div key={item.itemId} className="mb-4 last:mb-0">
                                            <MiniCartItemContainer
                                                item={item}
                                                removeAction={config.pages.cart.removeAction}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Bottom Divider */}
                            <Separator className="bg-muted-foreground/10" />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <p className="text-lg text-muted-foreground">{tMiniCart('emptyCart')}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {basket && basket.productItems && basket.productItems.length > 0 && (
                    <SheetFooter className="px-6 py-6 border-t flex-col gap-3 sm:flex-col">
                        <Button asChild className="w-full h-12 text-base font-semibold rounded-md" size="lg">
                            <Link to="/checkout" onClick={() => setOpen(false)}>
                                {t('checkout')}{' '}
                                {basket?.orderTotal
                                    ? formatCurrency(basket.orderTotal)
                                    : basket?.productTotal
                                      ? formatCurrency(basket.productTotal)
                                      : ''}
                            </Link>
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full h-12 text-base font-normal rounded-md"
                            size="lg"
                            onClick={() => setOpen(false)}>
                            {t('continueShopping')}
                        </Button>
                        {config.pages.cart.miniCart?.enableViewCartButton && (
                            <Button
                                asChild
                                variant="ghost"
                                className="w-full h-12 text-base font-normal rounded-md"
                                size="lg">
                                <Link to="/cart" onClick={() => setOpen(false)}>
                                    {tMiniCart('viewCart')}
                                </Link>
                            </Button>
                        )}
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}
