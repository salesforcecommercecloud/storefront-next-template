'use client';

import type React from 'react';
import { Link } from 'react-router';
import { DynamicImage } from '@/components/dynamic-image';

interface Suggestion {
    name: string;
    link: string;
    image?: string;
    price?: number;
}

interface SearchSuggestionsPopupProps {
    suggestions?: Suggestion[];
    closeAndNavigate?: (link: string) => void;
}

const SearchSuggestionsPopup: React.FC<SearchSuggestionsPopupProps> = ({ suggestions, closeAndNavigate }) => {
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    const handleClick = (link: string) => {
        if (closeAndNavigate) {
            closeAndNavigate(link);
        }
    };

    return (
        <div data-testid="sf-horizontal-product-suggestions" className="overflow-hidden">
            <div className="flex gap-4 overflow-x-hidden pb-2">
                {suggestions.map((suggestion) => (
                    <Link
                        data-testid="product-tile"
                        to={suggestion.link}
                        key={suggestion.link}
                        onClick={() => handleClick(suggestion.link)}
                        className="block hover:underline flex-1 max-w-[20%]">
                        <div className="w-full">
                            {/* Product Image */}
                            <div className="mb-2">
                                <div className="w-full relative aspect-[4/3]">
                                    {suggestion.image ? (
                                        <DynamicImage
                                            src={`${suggestion.image}[?sw={width}&q=60]`}
                                            alt={suggestion.name}
                                            imageProps={{
                                                className: 'absolute inset-0 w-full h-full object-cover block',
                                            }}
                                            loading="eager"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-muted-foreground">
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">📷</div>
                                                <div className="text-xs">No image available</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">{suggestion.name}</p>

                            {suggestion.price && (
                                <p className="text-sm font-semibold text-foreground">£{suggestion.price}</p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default SearchSuggestionsPopup;
