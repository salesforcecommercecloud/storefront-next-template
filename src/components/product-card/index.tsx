import { forwardRef, type ComponentProps } from 'react';
import { Link } from 'react-router';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { createProductUrl } from '@/lib/product-utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { ProductTile } from '@/components/product-tile';
import { productCardVariants, type ProductCardVariantsProps } from './variants';

interface ProductCardProps extends ComponentProps<'div'>, ProductCardVariantsProps {
    product: ShopperSearchTypes.ProductSearchHit;
}

const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(({ className, product, variant, ...props }, ref) => {
    return (
        <div ref={ref} className={cn(productCardVariants({ variant }), className)} {...props}>
            <Card className="ring-secondary/40 bg-muted/50 h-full">
                <CardContent className="text-secondary border-destructive/30">
                    <div className="group">
                        {/* Product Tile (Client Component) */}
                        <ProductTile product={product} maxSwatches={4} />
                    </div>
                </CardContent>

                <CardFooter>
                    {/*To PDP*/}
                    <Link
                        to={createProductUrl(product.productId)}
                        className="block w-full group-hover:underline transition-colors duration-200">
                        <Typography variant="product-title" as="h3">
                            {product.productName}
                        </Typography>

                        <Typography variant="product-price" className="mt-2">
                            {formatCurrency(product.price ?? 0)}
                        </Typography>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
});
ProductCard.displayName = 'ProductCard';

export { ProductCard };
export default ProductCard;
