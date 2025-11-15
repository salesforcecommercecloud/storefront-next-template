import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

export type FilterValue = NonNullable<ShopperSearch.schemas['ProductSearchRefinement']['values']>[0];
