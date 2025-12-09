import type { ComponentProps } from 'react';
import type { ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import ContentCard from '@/components/content-card';
import { Component, Loader } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { useTranslation } from 'react-i18next';
import heroImage from '/images/hero-cube.png';
import { loader } from './loaders';

interface PopularCategoryProps extends ComponentProps<'div'> {
    // Category data from Page Designer (via loader) or programmatic use
    category?: ShopperProducts.schemas['Category'];
    // Page Designer props (passed by Component wrapper, must be extracted to avoid passing to DOM)
    designMetadata?: ComponentDesignMetadata;
    regionId?: string;
    componentData?: Promise<Record<string, Promise<unknown>>>;
    page?: Promise<ShopperExperience.schemas['Page']>;
    // Loader data - full category object fetched by loader
    data?: ShopperProducts.schemas['Category'];
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('popularCategory', {
    name: 'Popular Category',
    description: 'Displays a single category card with image, title, description, and shop now button',
})
@Loader(loader)
export class PopularCategoryMetadata {
    @AttributeDefinition({
        name: 'Category',
        description: 'Select a category to display',
        type: 'category',
    })
    category?: string;
}
/* v8 ignore stop */

/**
 * PopularCategory component that displays a single category as a content card
 * Can be used in Page Designer or programmatically
 *
 * When used in Page Designer:
 * - Uses a single 'category' attribute (type: 'category') which stores the category ID
 * - The loader fetches the full category object and passes it via the 'data' prop
 *
 * When used programmatically:
 * - Accepts a full category object via the 'category' prop
 */
export default function PopularCategory({
    category,
    // Page Designer props - extracted to avoid passing to DOM
    designMetadata: _designMetadata,
    regionId: _regionId,
    componentData: _componentData,
    page: _page,
    // Loader data - full category object fetched by loader
    data,
    ...props
}: PopularCategoryProps) {
    const { t } = useTranslation('home');

    // Use data from loader (Page Designer) or category prop (programmatic use)
    // If category is a string, it's from Page Designer and we should ignore it (wait for loader data)
    // If category is an object, it's programmatic use
    const categoryData = data || (typeof category === 'object' && category !== null ? category : undefined);

    if (!categoryData) {
        // Fallback if no category data is provided
        return (
            <ContentCard
                title=""
                description=""
                imageUrl={heroImage}
                imageAlt=""
                buttonText={t('categoryGrid.shopNowButton')}
                buttonLink="/category/root"
                showBackground={true}
                showBorder={true}
                loading="eager"
                {...props}
            />
        );
    }

    const finalCategoryId = categoryData.id || '';
    const finalName = categoryData.name || '';
    const finalDescription = categoryData.pageDescription || categoryData.description || '';

    // Determine image URL - priority: category image > category banner > hero fallback
    const categoryImageUrl = categoryData.image || categoryData.c_slotBannerImage;
    const finalImageUrl = categoryImageUrl || heroImage;
    const finalImageAlt = categoryData.name || '';

    return (
        <ContentCard
            title={finalName}
            description={finalDescription}
            imageUrl={finalImageUrl as string}
            imageAlt={finalImageAlt}
            buttonText={t('categoryGrid.shopNowButton')}
            buttonLink={`/category/${finalCategoryId}`}
            showBackground={true}
            showBorder={true}
            loading="eager"
            {...props}
        />
    );
}
