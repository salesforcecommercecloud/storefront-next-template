import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';

export function createMockCategory(
    overrides: Partial<ShopperProductsTypes.Category> = {}
): ShopperProductsTypes.Category {
    const { onlineSubCategoriesCount, ...rest } = overrides;
    return {
        id: 'category-1',
        name: 'Test Category',
        c_showInMenu: true,
        onlineSubCategoriesCount: typeof onlineSubCategoriesCount === 'number' ? onlineSubCategoriesCount : 0,
        ...rest,
    };
}

export function createMockCategoryWithChildren(
    overrides: Partial<ShopperProductsTypes.Category> = {}
): ShopperProductsTypes.Category {
    const { id, name, categories, onlineSubCategoriesCount, ...rest } = overrides;
    return createMockCategory({
        id,
        name,
        categories,
        onlineSubCategoriesCount:
            typeof onlineSubCategoriesCount === 'number' ? onlineSubCategoriesCount : (categories?.length ?? 0),
        c_showInMenu: true,
        ...rest,
    });
}

export const testData = {
    // Basic categories without subcategories
    basic: [
        createMockCategory({ id: 'cat-1', name: 'Category 1', onlineSubCategoriesCount: 2 }),
        createMockCategory({ id: 'cat-2', name: 'Category 2', onlineSubCategoriesCount: 3 }),
        createMockCategory({ id: 'cat-3', name: 'Category 3', onlineSubCategoriesCount: 0 }),
    ],

    // Mixed visibility categories (some with c_showInMenu: false)
    mixedVisibility: [
        createMockCategory({
            id: 'visible-1',
            name: 'Visible Category 1',
            c_showInMenu: true,
            onlineSubCategoriesCount: 2,
        }),
        createMockCategory({
            id: 'hidden-1',
            name: 'Hidden Category 1',
            c_showInMenu: false,
            onlineSubCategoriesCount: 2,
        }),
        createMockCategory({
            id: 'visible-2',
            name: 'Visible Category 2',
            c_showInMenu: true,
            onlineSubCategoriesCount: 3,
        }),
        createMockCategory({
            id: 'hidden-2',
            name: 'Hidden Category 2',
            c_showInMenu: false,
            onlineSubCategoriesCount: 2,
        }),
        createMockCategory({
            id: 'visible-3',
            name: 'Visible Category 3',
            c_showInMenu: true,
            onlineSubCategoriesCount: 0,
        }),
    ],

    // Deep nesting structure
    deepNesting: [
        createMockCategoryWithChildren({
            id: 'parent-1',
            name: 'Parent Category 1',
            categories: [
                createMockCategoryWithChildren({
                    id: 'child-1-1',
                    name: 'Child 1.1',
                    categories: [
                        createMockCategory({ id: 'grandchild-1-1-1', name: 'Grandchild 1.1.1' }),
                        createMockCategory({ id: 'grandchild-1-1-2', name: 'Grandchild 1.1.2' }),
                    ],
                }),
                createMockCategory({ id: 'child-1-2', name: 'Child 1.2' }),
            ],
        }),
        createMockCategoryWithChildren({
            id: 'parent-2',
            name: 'Parent Category 2',
            categories: [
                createMockCategory({ id: 'child-2-1', name: 'Child 2.1' }),
                createMockCategory({ id: 'child-2-2', name: 'Child 2.2' }),
            ],
        }),
    ],
};
