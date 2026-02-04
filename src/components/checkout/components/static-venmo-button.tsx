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

import { Button } from '@/components/ui/button';
import VenmoLogo from './venmo-logo';

interface StaticVenmoButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Static Venmo Button Component
 * Matches the exact appearance of Venmo SDK button
 * Uses official Venmo blue color (#3D95CE) and logo
 */
export default function StaticVenmoButton({ onClick, disabled = false }: StaticVenmoButtonProps) {
    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            className="w-full h-12 bg-[var(--venmo-blue)] hover:bg-[#2d7fb8] text-background border-0 rounded-lg flex items-center justify-center transition-colors"
            size="lg"
            aria-label="Venmo">
            <VenmoLogo className="flex-shrink-0" />
        </Button>
    );
}
