'use client';

import { Link } from 'react-router';
import SuggestionsList from './suggestions-list';
import SuggestionsGrid from './suggestions-grid';
import { searchUrlBuilder } from '@/lib/url';
import uiStrings from '@/temp-ui-string';

interface PhraseSuggestion {
    name: string;
    link: string;
    exactMatch?: boolean;
}

interface CategorySuggestion {
    name: string;
    link: string;
    type: string;
}

interface ProductSuggestion {
    name: string;
    link: string;
    type: string;
    image?: string;
    price?: number;
}

interface EinsteinSuggestion {
    name: string;
    link: string;
    type: string;
    exactMatch?: boolean;
}

interface SearchSuggestions {
    categorySuggestions?: CategorySuggestion[];
    productSuggestions?: ProductSuggestion[];
    phraseSuggestions?: PhraseSuggestion[];
    popularSearchSuggestions?: EinsteinSuggestion[];
    recentSearchSuggestions?: EinsteinSuggestion[];
    searchPhrase?: string;
}

interface SuggestionSectionProps {
    searchSuggestions: SearchSuggestions;
    closeAndNavigate: (link: string) => void;
}

interface DidYouMeanProps {
    suggestion: PhraseSuggestion;
    onLinkClick: (link: string) => () => void;
}

const DidYouMean = ({ suggestion, onLinkClick }: DidYouMeanProps) => (
    <div className="mb-2">
        <p className="text-base text-foreground pl-12">
            {uiStrings.search.suggestions.didYouMean}{' '}
            <Link
                to={suggestion.link}
                className="text-foreground hover:text-foreground/80 font-medium"
                onMouseDown={onLinkClick(suggestion.link)}>
                {suggestion.name}?
            </Link>
        </p>
    </div>
);

export default function SuggestionSection({ searchSuggestions, closeAndNavigate }: SuggestionSectionProps) {
    const hasCategories = Boolean(searchSuggestions?.categorySuggestions?.length);
    const hasProducts = Boolean(searchSuggestions?.productSuggestions?.length);
    const hasPhraseSuggestions = Boolean(searchSuggestions?.phraseSuggestions?.length);
    const hasPopularSearches = Boolean(searchSuggestions?.popularSearchSuggestions?.length);

    const firstPhraseSuggestion = searchSuggestions?.phraseSuggestions?.[0];
    const showDidYouMean = hasPhraseSuggestions && firstPhraseSuggestion?.exactMatch === false;

    const handleLinkClick = (link: string) => () => {
        closeAndNavigate(link);
    };

    return (
        <div className="p-6 space-y-0">
            {/* Mobile - Vertical alignment */}
            <div className="block md:hidden">
                {showDidYouMean && firstPhraseSuggestion && (
                    <DidYouMean suggestion={firstPhraseSuggestion} onLinkClick={handleLinkClick} />
                )}

                {hasCategories && (
                    <div className="mb-2">
                        <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">
                            {uiStrings.search.suggestions.categories}
                        </div>
                        <SuggestionsList
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions.categorySuggestions}
                        />
                    </div>
                )}

                {hasProducts && (
                    <div className="mb-2">
                        <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">
                            {uiStrings.search.suggestions.products}
                        </div>
                        <SuggestionsList
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions.productSuggestions}
                        />
                    </div>
                )}

                {hasPopularSearches && (
                    <div className="mb-2">
                        <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">
                            {uiStrings.search.suggestions.popularSearches}
                        </div>
                        <SuggestionsList
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions.popularSearchSuggestions}
                        />
                    </div>
                )}
            </div>

            {/* Desktop - Horizontal layout */}
            <div className="hidden md:flex gap-5">
                <div className="flex-1">
                    {showDidYouMean && firstPhraseSuggestion && (
                        <DidYouMean suggestion={firstPhraseSuggestion} onLinkClick={handleLinkClick} />
                    )}

                    {hasCategories && (
                        <div className="mb-2">
                            <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">
                                {uiStrings.search.suggestions.categories}
                            </div>
                            <SuggestionsList
                                closeAndNavigate={closeAndNavigate}
                                suggestions={searchSuggestions.categorySuggestions}
                            />
                        </div>
                    )}

                    {hasPopularSearches && (
                        <div className="mb-2">
                            <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">
                                {uiStrings.search.suggestions.popularSearches}
                            </div>
                            <SuggestionsList
                                closeAndNavigate={closeAndNavigate}
                                suggestions={searchSuggestions.popularSearchSuggestions}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-[3] min-w-0 overflow-hidden">
                    {hasProducts && (
                        <SuggestionsGrid
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions?.productSuggestions}
                        />
                    )}
                </div>

                <div className="flex-1 flex items-center">
                    {hasProducts && (
                        <div className="text-center w-full">
                            <Link
                                to={searchUrlBuilder(searchSuggestions?.searchPhrase || '')}
                                className="text-foreground hover:text-foreground/80 font-medium text-base"
                                onMouseDown={handleLinkClick(searchUrlBuilder(searchSuggestions?.searchPhrase || ''))}>
                                {uiStrings.search.suggestions.viewAll}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
