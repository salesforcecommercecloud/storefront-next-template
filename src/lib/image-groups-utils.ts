import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';

interface ImageGroupOptions {
    viewType: string;
    selectedVariationAttributes?: Record<string, string>;
}

/**
 * Find the ImageGroup that matches the criteria supplied
 *
 * @param imageGroups - The product/variations image groups you want to search.
 * @param options - Search criteria to match on the ImageGroup object.
 * @returns The ImageGroup matching the search criteria
 */
export const findImageGroupBy = (
    imageGroups: ShopperProductsTypes.ImageGroup[] = [],
    options: ImageGroupOptions
): ShopperProductsTypes.ImageGroup | undefined => {
    const { viewType } = options;
    let { selectedVariationAttributes = {} } = options;

    // Start by filtering out any imageGroup that isn't the correct viewType.
    imageGroups = imageGroups.filter(({ viewType: imageGroupViewType }) => imageGroupViewType === viewType);

    // Not all variation attributes are reflected in images. For example, you probably
    // won't have a separate image group for various sizes, but you might for colors. For that
    // reason we need to know what are valid attribute values to filter on.
    const refinableAttributeIds = [
        ...new Set(
            imageGroups.reduce(
                (acc: string[], { variationAttributes = [] }) => [
                    ...acc,
                    ...variationAttributes.map((attr) => attr.id),
                ],
                []
            )
        ),
    ];

    // Update the `selectedVariationAttributes` by filtering out the attributes that have no
    // representation in this imageGroup.
    selectedVariationAttributes = Object.keys(selectedVariationAttributes).reduce(
        (acc: Record<string, string>, curr: string) => {
            return refinableAttributeIds.includes(curr)
                ? {
                      ...acc,
                      [`${curr}`]: selectedVariationAttributes[curr],
                  }
                : acc;
        },
        {}
    );

    // Find the image group that has all the selected variation value attributes.
    const foundImageGroup = imageGroups.find(({ variationAttributes = [] }) => {
        const selectedIds = Object.keys(selectedVariationAttributes);

        return selectedIds.every((selectedId) => {
            const selectedValue = selectedVariationAttributes[selectedId];

            return variationAttributes.find(
                ({ id, values }) => id === selectedId && values?.every(({ value }) => value === selectedValue)
            );
        });
    });

    return foundImageGroup;
};
