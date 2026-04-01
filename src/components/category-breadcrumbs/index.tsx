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
import type { ReactElement } from 'react';
import { Link } from '@/components/link';
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
