import { type UseFormReturn } from 'react-hook-form';
import type { FetcherWithComponents } from 'react-router';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

// Type for the form data (inferred from schema in index.tsx)
export type PromoCodeFormData = {
    code: string;
};

// Type for the fetcher data response
export type PromoCodeFetcherData = {
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: string;
};

// Props interface for PromoCodeForm component
export interface PromoCodeFormProps {
    basket?: ShopperBasketsV2.schemas['Basket'];
}

// Props interface for PromoCodeFields component
export interface PromoCodeFieldsProps {
    form: UseFormReturn<PromoCodeFormData>;
    applyFetcher: FetcherWithComponents<PromoCodeFetcherData>;
}
