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
import { forwardRef, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

export interface StarIconProps extends SVGProps<SVGSVGElement> {
    /**
     * Opacity value for the star (0-1)
     */
    opacity: number;
    /**
     * Whether the star is filled (yellow) or unfilled (gray)
     */
    filled: boolean;
}

/**
 * Star icon component for rating displays
 */
export const StarIcon = forwardRef<SVGSVGElement, StarIconProps>(({ opacity, filled, className, ...props }, ref) => (
    <svg
        ref={ref}
        className={cn(filled ? 'text-rating' : 'text-muted-foreground/30', className)}
        fill="currentColor"
        viewBox="0 0 20 20"
        style={{ opacity }}
        {...props}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
));

StarIcon.displayName = 'StarIcon';
