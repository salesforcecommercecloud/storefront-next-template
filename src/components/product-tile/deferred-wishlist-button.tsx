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
import { type ComponentProps, lazy, Suspense, useCallback, useState } from 'react';
import { type WishlistButton } from '@/components/buttons/wishlist-button';
import { HeartIcon } from '@/components/icons';

const LazyWishlistButton = lazy(() =>
    import('@/components/buttons/wishlist-button').then((m) => ({ default: m.WishlistButton }))
);

type WishlistButtonProps = ComponentProps<typeof WishlistButton>;

/**
 * Deferred WishlistButton for product tiles. Renders a placeholder icon until the tile receives a pointer event, then
 * lazy-loads the real {@link WishlistButton} (with its heavy useWishlist / useRequireAuth hooks).
 */
export function DeferredWishlistButton(props: WishlistButtonProps) {
    const [loaded, setLoaded] = useState(false);

    const handlePointerEnter = useCallback(() => {
        if (!loaded) {
            setLoaded(true);
        }
    }, [loaded]);

    if (loaded) {
        return (
            <Suspense fallback={<HeartIcon size={props.size} className={props.className} tabIndex={props.tabIndex} />}>
                <LazyWishlistButton {...props} />
            </Suspense>
        );
    }

    return (
        <HeartIcon
            size={props.size}
            className={props.className}
            tabIndex={props.tabIndex}
            onPointerEnter={handlePointerEnter}
        />
    );
}
