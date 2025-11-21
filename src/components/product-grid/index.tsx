import type { ReactElement } from 'react';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { ProductTile } from '@/components/product-tile';

interface ProductGridProps {
    products: ShopperSearch.schemas['ProductSearchHit'][];
    handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
}
export default function ProductGrid({ products, handleProductClick }: ProductGridProps): ReactElement {
    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                {products.map((product) => (
                    <ProductTile key={product.productId} product={product} handleProductClick={handleProductClick} />
                ))}
            </div>

            {/* Show a message when no products are found */}
            {products.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">No products found.</p>
                </div>
            )}
        </>
    );
}
