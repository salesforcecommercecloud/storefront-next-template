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

import { Funnel } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FiltersButtonProps {
    /** Callback when button is clicked */
    onClick: () => void;
    /** Whether the filters panel is currently shown */
    isActive?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Button component that toggles the filters panel.
 */
export default function FiltersButton({ onClick, isActive = false, className }: FiltersButtonProps) {
    const { t } = useTranslation();
    const filtersLabel = t('categoryRefinements:filtersButtonLabel');

    return (
        <Button
            variant={isActive ? 'default' : 'outline'}
            onClick={onClick}
            className={cn(className)}
            aria-label={filtersLabel}
            aria-pressed={isActive}>
            <Funnel className="size-4 mr-2" />
            {filtersLabel}
        </Button>
    );
}
