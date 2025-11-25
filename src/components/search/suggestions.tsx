'use client';

import RecentSearches from './recent-searches';
import SuggestionSection from './suggestions-section';

interface SuggestionsData {
    categorySuggestions?: unknown[];
    productSuggestions?: unknown[];
    popularSearchSuggestions?: unknown[];
}

interface SuggestionsProps {
    searchSuggestions: SuggestionsData | null;
    recentSearches: string[];
    closeAndNavigate: (link: string) => void;
    clearRecentSearches: () => void;
}

export default function Suggestions({
    searchSuggestions,
    recentSearches,
    closeAndNavigate,
    clearRecentSearches,
}: SuggestionsProps) {
    const hasCategories = Boolean(searchSuggestions?.categorySuggestions?.length);
    const hasProducts = Boolean(searchSuggestions?.productSuggestions?.length);
    const hasPopularSearches = Boolean(searchSuggestions?.popularSearchSuggestions?.length);
    const hasSuggestions = hasCategories || hasProducts || hasPopularSearches;

    return (
        <div>
            {hasSuggestions ? (
                <SuggestionSection searchSuggestions={searchSuggestions} closeAndNavigate={closeAndNavigate} />
            ) : (
                <RecentSearches
                    recentSearches={recentSearches}
                    closeAndNavigate={closeAndNavigate}
                    clearRecentSearches={clearRecentSearches}
                />
            )}
        </div>
    );
}
