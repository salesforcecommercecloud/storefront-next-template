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

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryScrollContainerProps {
    children: ReactNode;
    /** Accessible label for the scroll region */
    ariaLabel?: string;
}

export function CategoryScrollContainer({ children, ariaLabel }: CategoryScrollContainerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', checkScroll, { passive: true });
        const observer = new ResizeObserver(checkScroll);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            observer.disconnect();
        };
    }, [checkScroll]);

    const scroll = useCallback((direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const scrollAmount = el.clientWidth * 0.8;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    }, []);

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('left')}
                className={cn(
                    'hidden md:flex absolute z-10 rounded-lg shadow-md transition-all duration-300 left-0 top-1/2 -translate-y-1/2 -translate-x-1/2',
                    !canScrollLeft && 'opacity-0 pointer-events-none'
                )}
                aria-label={ariaLabel ? `Scroll ${ariaLabel} left` : 'Scroll left'}>
                <ChevronLeft className="w-5 h-5" />
            </Button>

            <div
                ref={scrollRef}
                className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list">
                {children}
            </div>

            <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('right')}
                className={cn(
                    'hidden md:flex absolute z-10 rounded-lg shadow-md transition-all duration-300 right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
                    !canScrollRight && 'opacity-0 pointer-events-none'
                )}
                aria-label={ariaLabel ? `Scroll ${ariaLabel} right` : 'Scroll right'}>
                <ChevronRight className="w-5 h-5" />
            </Button>
        </div>
    );
}
