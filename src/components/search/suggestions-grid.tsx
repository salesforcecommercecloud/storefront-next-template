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
'use client';

import type React from 'react';
import { Link } from 'react-router';
import { DynamicImage } from '@/components/dynamic-image';
import { useAnalytics } from '@/hooks/use-analytics';
import { toImageUrl } from '@/lib/dynamic-image';
import { useConfig } from '@/config';

interface Suggestion {
    name: string;
    link: string;
    image?: string;
    price?: number;
}

interface SearchSuggestionsPopupProps {
    suggestions?: Suggestion[];
    searchPhrase?: string;
    closeAndNavigate?: (link: string) => void;
}

const SearchSuggestionsPopup: React.FC<SearchSuggestionsPopupProps> = ({
    suggestions,
    searchPhrase,
    closeAndNavigate,
}) => {
    const analytics = useAnalytics();
    const config = useConfig();
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    const handleClick = (suggestion: Suggestion) => {
        void analytics.trackClickSearchSuggestion({
            searchInputText: searchPhrase || '',
            suggestion: suggestion.name,
        });
        if (closeAndNavigate) {
            closeAndNavigate(suggestion.link);
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
                        onMouseDown={() => handleClick(suggestion)}
                        className="block hover:underline flex-1 max-w-[20%]">
                        <div className="w-full">
                            {/* Product Image */}
                            <div className="mb-2">
                                <div className="w-full relative aspect-[4/3]">
                                    {suggestion.image ? (
                                        <DynamicImage
                                            src={`${toImageUrl({ src: suggestion.image, config })}[?sw={width}]`}
                                            alt=""
                                            imageProps={{
                                                className: 'absolute inset-0 w-full h-full object-cover block',
                                                'aria-hidden': true,
                                            }}
                                            loading="eager"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted text-foreground">
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
