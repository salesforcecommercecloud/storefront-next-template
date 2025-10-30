'use client';

import { type ReactElement, type KeyboardEvent } from 'react';
import { DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import uiStrings from '@/temp-ui-string';
import { usePriceRangeValidation } from '@/hooks/use-price-range-validation';

interface PriceInputProps {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    hasError: boolean;
}

function PriceInput({ placeholder, value, onChange, onKeyDown, hasError }: PriceInputProps) {
    return (
        <div className="bg-custom-bg-input-30 rounded-[var(--radius-2px)] border-solid border-[var(--input)] border py-2 px-3 flex flex-row gap-2 items-center justify-start flex-1 relative overflow-hidden shadow-xs">
            <DollarSign className="shrink-0 w-4 h-4 relative overflow-visible text-muted-foreground" />
            <div className="text-muted-foreground text-left font-text-sm-leading-normal-normal-font-family text-sm leading-normal font-normal relative overflow-hidden flex-1 truncate whitespace-nowrap">
                <Input
                    type="number"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    className={`border-0 p-0 h-auto text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground w-full ${
                        hasError ? 'text-destructive' : ''
                    }`}
                    min="0"
                />
            </div>
        </div>
    );
}

export interface PriceRangeInputProps {
    /** Current min price value */
    minPrice: string;
    /** Current max price value */
    maxPrice: string;
    /** Callback when values change */
    onChange: (minPrice: string, maxPrice: string) => void;
    /** Callback when filter should be applied */
    onApply?: () => void;
    /** Minimum allowed price */
    minAllowed?: number;
    /** Maximum allowed price */
    maxAllowed?: number;
    /** Whether to show validation errors */
    showValidationErrors?: boolean;
}

export default function PriceRangeInput({
    minPrice,
    maxPrice,
    onChange,
    onApply,
    minAllowed,
    maxAllowed,
    showValidationErrors = true,
}: PriceRangeInputProps): ReactElement {
    const validation = usePriceRangeValidation(minPrice, maxPrice, minAllowed, maxAllowed);
    const minHasError = showValidationErrors && validation.minHasError;
    const maxHasError = showValidationErrors && validation.maxHasError;

    const handleMinChange = (newMin: string) => {
        onChange(newMin, maxPrice);
    };

    const handleMaxChange = (newMax: string) => {
        onChange(minPrice, newMax);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && onApply && !minHasError && !maxHasError) {
            onApply();
        }
    };

    return (
        <div className="flex flex-row gap-3 items-center justify-start self-stretch shrink-0 relative">
            <PriceInput
                placeholder={uiStrings.product.priceMin}
                value={minPrice}
                onChange={handleMinChange}
                onKeyDown={handleKeyDown}
                hasError={minHasError}
            />

            <div className="text-foreground text-left font-text-sm-leading-none-normal-font-family text-sm leading-none font-normal relative">
                {uiStrings.product.priceTo}
            </div>

            <PriceInput
                placeholder={uiStrings.product.priceMax}
                value={maxPrice}
                onChange={handleMaxChange}
                onKeyDown={handleKeyDown}
                hasError={maxHasError}
            />
        </div>
    );
}
