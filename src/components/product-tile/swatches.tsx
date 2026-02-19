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
import type { DecoratedVariationAttribute } from '@/lib/product-utils';
import { SwatchGroup, Swatch } from '@/components/swatch-group';
import { toImageUrl } from '@/lib/dynamic-image';
import { useConfig } from '@/config';

// Simple component to display the "+X more" indicator for additional swatches
const MoreSwatchesIndicator = ({ count }: { count: number }) => (
    <div
        className="relative shrink-0 rounded-full border-2 border-border bg-background flex items-center justify-center cursor-pointer w-7 h-7"
        title={`+${count}`}>
        <svg className="text-muted-foreground w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    </div>
);

const Swatches = ({
    variationAttributes,
    maxSwatches,
    selectedAttributeValue,
    handleAttributeChange,
    disableSwatchInteraction,
    selectedVariantColorValue,
    swatchMode,
}: {
    variationAttributes: DecoratedVariationAttribute[];
    maxSwatches: number;
    selectedAttributeValue: string | null;
    handleAttributeChange: (value: string) => void;
    disableSwatchInteraction: boolean;
    selectedVariantColorValue?: string | null;
    swatchMode: 'hover' | 'click';
}) => {
    const config = useConfig();
    return (
        <>
            {variationAttributes?.map(({ id, name, values }) => {
                // For variant products in wishlist: filter to show only the selected variant's swatch
                // For master products: show all swatches and allow interaction
                const isVariantProduct = disableSwatchInteraction && selectedVariantColorValue;
                const swatchesToShow = isVariantProduct
                    ? values?.filter((v) => v.value === selectedVariantColorValue) || []
                    : values?.slice(0, maxSwatches) || [];

                // Only disable interaction for variant products (when selectedVariantColorValue is provided)
                // Master products should allow interaction for preview
                const shouldDisableInteraction = isVariantProduct;

                return (
                    <SwatchGroup
                        key={id}
                        ariaLabel={name}
                        value={selectedAttributeValue || ''}
                        handleChange={shouldDisableInteraction ? undefined : handleAttributeChange}>
                        {swatchesToShow.map(({ name: valueName, swatch, value }) => {
                            // For color attributes, show swatch image/color; for others, show text
                            const content =
                                swatch && id === 'color' ? (
                                    <div
                                        className="bg-no-repeat bg-cover bg-center rounded-full w-full h-full"
                                        style={{
                                            backgroundColor: valueName?.toLowerCase(),
                                            backgroundImage: `url(${toImageUrl({ image: swatch, config })})`,
                                        }}
                                        aria-label={valueName}
                                    />
                                ) : (
                                    <span className="text-xs font-medium truncate">{valueName}</span>
                                );

                            return (
                                <Swatch
                                    key={value}
                                    value={value}
                                    name={valueName}
                                    shape={id === 'color' ? 'circle' : 'square'}
                                    size="md"
                                    selected={selectedAttributeValue === value}
                                    disabled={false}
                                    handleSelect={
                                        shouldDisableInteraction
                                            ? undefined
                                            : (attributeValue: string | null) => {
                                                  if (attributeValue !== null) {
                                                      handleAttributeChange(attributeValue);
                                                  }
                                              }
                                    }
                                    isFocusable={!shouldDisableInteraction}
                                    mode={shouldDisableInteraction ? undefined : swatchMode}>
                                    {content}
                                </Swatch>
                            );
                        })}
                        {/* Only show "more" indicator if not filtering to single variant and there are more swatches */}
                        {!isVariantProduct && values && values.length > maxSwatches && (
                            <MoreSwatchesIndicator count={values.length - maxSwatches} />
                        )}
                    </SwatchGroup>
                );
            })}
        </>
    );
};

export default Swatches;
