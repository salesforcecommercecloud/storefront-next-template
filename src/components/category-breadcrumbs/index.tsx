import type { ReactElement } from 'react';
import { Link } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { ChevronRight } from 'lucide-react';

type PathRecord = Required<ShopperProducts.schemas['Category']>['parentCategoryTree'][0];

export default function CategoryBreadcrumbs({
    category,
}: {
    category: ShopperProducts.schemas['Category'];
}): ReactElement {
    const items: PathRecord[] = category.parentCategoryTree ?? [{ id: category.id, name: category.name }];
    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center text-sm">
                {items.map((item, index) => (
                    <li key={item.id} className="flex items-center">
                        {index > 0 && <ChevronRight className="mx-1 size-3" />}

                        <Link to={`/category/${item.id}`} className="text-primary-600 hover:underline">
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
