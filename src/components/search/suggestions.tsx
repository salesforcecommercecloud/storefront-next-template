'use client';

import { Link } from 'react-router';
import SuggestionsList from './suggestions-list';
import SuggestionsGrid from './suggestions-grid';
import { searchUrlBuilder } from '@/lib/url';

interface PhraseSuggestion {
    name: string;
    link: string;
    exactMatch?: boolean;
}

interface CategorySuggestion {
    name: string;
    link: string;
}

interface ProductSuggestion {
    name: string;
    link: string;
    image?: string;
    price?: number;
}

interface SearchSuggestions {
    categorySuggestions?: CategorySuggestion[];
    productSuggestions?: ProductSuggestion[];
    phraseSuggestions?: PhraseSuggestion[];
    searchPhrase?: string;
}

interface SearchSuggestionsSectionProps {
    searchSuggestions: SearchSuggestions;
    closeAndNavigate: (link: string) => void;
}

const SearchSuggestionsSection = ({ searchSuggestions, closeAndNavigate }: SearchSuggestionsSectionProps) => {
    const hasCategories = Boolean(searchSuggestions?.categorySuggestions?.length);
    const hasProducts = Boolean(searchSuggestions?.productSuggestions?.length);
    const hasPhraseSuggestions = Boolean(searchSuggestions?.phraseSuggestions?.length);

    const handleLinkClick = (link: string) => () => {
        closeAndNavigate(link);
    };

    return (
        <div className="p-6 space-y-0">
            {/* Mobile - Vertical alignment */}
            <div className="block md:hidden">
                {hasPhraseSuggestions && searchSuggestions?.phraseSuggestions?.[0]?.exactMatch === false && (
                    <div className="mb-4">
                        <p className="text-base text-foreground pl-12">
                            Did you mean{' '}
                            <Link
                                className="text-foreground hover:text-foreground/80 font-medium"
                                onClick={handleLinkClick(searchSuggestions.phraseSuggestions[0].link)}>
                                {searchSuggestions.phraseSuggestions[0].name}?
                            </Link>
                        </p>
                    </div>
                )}

                {hasCategories && (
                    <div className="mb-2">
                        <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">Categories</div>
                        <SuggestionsList
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions.categorySuggestions}
                        />
                    </div>
                )}

                {hasProducts && (
                    <div>
                        <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">Products</div>
                        <SuggestionsList
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions.productSuggestions}
                        />
                    </div>
                )}
            </div>

            {/* Desktop - Horizontal layout */}
            <div className="hidden md:flex gap-5">
                <div className="flex-1">
                    {hasPhraseSuggestions && searchSuggestions?.phraseSuggestions?.[0]?.exactMatch === false && (
                        <div className="mb-4">
                            <p className="text-base text-foreground pl-12">
                                Did you mean{' '}
                                <Link
                                    className="text-foreground hover:text-foreground/80 font-medium"
                                    onClick={handleLinkClick(searchSuggestions.phraseSuggestions[0].link)}>
                                    {searchSuggestions.phraseSuggestions[0].name}?
                                </Link>
                            </p>
                        </div>
                    )}

                    {hasCategories && (
                        <div>
                            <div className="text-sm text-muted-foreground font-light mb-1 pl-12 ">Categories</div>
                            <SuggestionsList
                                closeAndNavigate={closeAndNavigate}
                                suggestions={searchSuggestions.categorySuggestions}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-[3] min-w-0 overflow-hidden">
                    {hasProducts && (
                        <SuggestionsGrid
                            closeAndNavigate={closeAndNavigate}
                            suggestions={searchSuggestions.productSuggestions}
                        />
                    )}
                </div>

                <div className="flex-1 flex items-center">
                    {hasProducts && (
                        <div className="text-center w-full">
                            <Link
                                to={searchUrlBuilder(searchSuggestions?.searchPhrase || '')}
                                className="text-foreground hover:text-foreground/80 font-medium text-base"
                                onClick={handleLinkClick(searchUrlBuilder(searchSuggestions?.searchPhrase || ''))}>
                                View All
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchSuggestionsSection;
