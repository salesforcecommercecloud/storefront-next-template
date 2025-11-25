'use client';

import { searchUrlBuilder } from '@/lib/url';
import uiStrings from '@/temp-ui-string';

interface RecentSearchesProps {
    recentSearches?: string[];
    closeAndNavigate: (link: string) => void;
    clearRecentSearches: () => void;
}

export default function RecentSearches({
    recentSearches = [],
    closeAndNavigate,
    clearRecentSearches,
}: RecentSearchesProps) {
    return (
        <div className="p-6">
            {recentSearches.length > 0 && (
                <div>
                    <div className="text-sm font-semibold text-foreground mb-2">
                        {uiStrings.search.suggestions.recentSearches}
                    </div>
                    <div className="-mx-6">
                        {recentSearches.map((recentSearch) => (
                            <button
                                key={recentSearch}
                                type="button"
                                onMouseDown={() => {
                                    closeAndNavigate(searchUrlBuilder(recentSearch));
                                }}
                                className="w-full text-left px-12 py-2 hover:bg-accent text-base font-normal">
                                {recentSearch}
                            </button>
                        ))}
                        <button
                            type="button"
                            onMouseDown={clearRecentSearches}
                            className="w-full text-left px-12 py-2 hover:bg-accent text-primary text-base font-normal">
                            {uiStrings.search.suggestions.clearRecentSearches}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
