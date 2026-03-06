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

import type { ReactElement, ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CollapsibleSectionProps {
    /** The label rendered inside the summary row */
    label: string;
    /** Content revealed when the section is open */
    children: ReactNode;
    /** Whether the section starts open. Defaults to false. */
    defaultOpen?: boolean;
    /** Additional classes forwarded to the outer <details> element */
    className?: string;
}

/**
 * A native HTML `<details>`/`<summary>` collapsible section.
 * SSR-safe — no JavaScript required for open/close behaviour.
 */
export default function CollapsibleSection({
    label,
    children,
    defaultOpen = false,
    className,
}: CollapsibleSectionProps): ReactElement {
    return (
        <details className={cn('group border-b border-border', className)} open={defaultOpen || undefined}>
            <summary className="flex items-center justify-between gap-4 py-4 text-base font-medium text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-colors">
                {label}
                <ChevronDownIcon
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none size-5 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180"
                />
            </summary>
            {children}
        </details>
    );
}
