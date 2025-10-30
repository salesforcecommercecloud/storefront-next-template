'use client';

import type { ReactElement } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CartBadgeIcon({ numberOfItems }: { numberOfItems: number }): ReactElement {
    return (
        <>
            <ShoppingCart className="size-6" data-testid="shopping-cart-icon" />
            <Badge
                variant="destructive"
                className="h-4 min-w-4 rounded-full px-1 font-mono tabular-num"
                data-testid="shopping-cart-badge">
                {numberOfItems}
            </Badge>
        </>
    );
}
