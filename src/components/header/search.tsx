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
import { type FormEvent, type ReactElement, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import debounce from 'lodash.debounce';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search as SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Suggestions from '@/components/search/suggestions';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { useTransformSearchSuggestions } from '@/hooks/use-transform-search-suggestions';
import { useConfig } from '@/config';
import { getSessionJSONItem, setSessionJSONItem, clearSessionJSONItem } from '@/lib/utils';

const RECENT_SEARCH_LIMIT = 5;
const RECENT_SEARCH_KEY = 'recent-search-key';
const RECENT_SEARCH_MIN_LENGTH = 3;
const POPOVER_CONTENT_OFFSET = 12;

export default function SearchBar(): ReactElement {
    const { t } = useTranslation('header');
    const navigate = useNavigate();
    const config = useConfig();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const queryRef = useRef(query);
    const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

    const { data: suggestions, refetch } = useSearchSuggestions({
        q: query,
        expand: ['images', 'prices'],
        includeEinsteinSuggestedPhrases: true,
        enabled: query.trim().length >= RECENT_SEARCH_MIN_LENGTH,
    });

    const transformedSuggestions = useTransformSearchSuggestions(suggestions);

    useEffect(() => {
        queryRef.current = query;
        refetchRef.current = refetch;
    }, [query, refetch]);

    const saveRecentSearch = useCallback((searchText: string) => {
        let searches = getSessionJSONItem<string[]>(RECENT_SEARCH_KEY) || [];
        searches = searches.filter((savedSearchTerm) => {
            return searchText.toLowerCase() !== savedSearchTerm.toLowerCase();
        });
        searches = [searchText, ...searches].slice(0, RECENT_SEARCH_LIMIT);
        setSessionJSONItem(RECENT_SEARCH_KEY, searches);
    }, []);

    const debouncedRefetch = useMemo(() => {
        return debounce(() => {
            const currentQuery = queryRef.current;
            if (currentQuery.trim().length >= RECENT_SEARCH_MIN_LENGTH) {
                void refetchRef.current();
            }
        }, config.pages.search.suggestionsDebounce);
    }, [config.pages.search.suggestionsDebounce]);

    useEffect(() => {
        if (query.trim().length >= RECENT_SEARCH_MIN_LENGTH) {
            debouncedRefetch();
        } else {
            debouncedRefetch.cancel();
        }

        return () => {
            debouncedRefetch.cancel();
        };
    }, [query, debouncedRefetch]);

    const shouldOpenPopover = useCallback(() => {
        const recentSearches = getSessionJSONItem<string[]>(RECENT_SEARCH_KEY) || [];
        const searchSuggestionsAvailable =
            transformedSuggestions &&
            (transformedSuggestions.categorySuggestions.length > 0 ||
                transformedSuggestions.productSuggestions.length > 0 ||
                (transformedSuggestions.popularSearchSuggestions?.length ?? 0) > 0);

        if (
            (document.activeElement === inputRef.current && recentSearches.length > 0) ||
            (searchSuggestionsAvailable && inputRef.current?.value && inputRef.current.value.length > 0)
        ) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [transformedSuggestions]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setQuery(value);
            shouldOpenPopover();
        },
        [shouldOpenPopover]
    );

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (inputRef.current?.value?.trim()) {
                const searchQuery = inputRef.current.value.trim();
                saveRecentSearch(searchQuery);
                setShowSuggestions(false);
                void navigate(`/search?q=${encodeURIComponent(searchQuery)}`, {
                    state: { query: searchQuery },
                });
            }
        },
        [navigate, saveRecentSearch]
    );

    const closeAndNavigate = useCallback(
        (link: string) => {
            inputRef.current?.blur();
            setShowSuggestions(false);
            setQuery('');
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            if (link) {
                void navigate(link);
            }
        },
        [navigate]
    );

    const clearRecentSearches = useCallback(() => {
        clearSessionJSONItem(RECENT_SEARCH_KEY);
        setShowSuggestions(false);
    }, []);

    useEffect(() => {
        shouldOpenPopover();
    }, [query, suggestions, shouldOpenPopover]);

    return (
        <Popover open={showSuggestions}>
            <form onSubmit={handleSubmit} className="relative z-10">
                <div className="relative">
                    <PopoverTrigger asChild>
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-10"
                            onChange={handleInputChange}
                            onFocus={shouldOpenPopover}
                            onBlur={() => setShowSuggestions(false)}
                            aria-label={t('searchPlaceholder')}
                            aria-autocomplete="list"
                            aria-expanded={showSuggestions}
                            aria-haspopup="listbox"
                            role="combobox"
                        />
                    </PopoverTrigger>
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2" />
                </div>
            </form>
            <PopoverContent
                className="w-screen p-0 border shadow-[0px_1px_12px_rgba(0,0,0,0.25)] max-h-80 overflow-y-auto"
                align="start"
                side="bottom"
                sideOffset={POPOVER_CONTENT_OFFSET}
                onOpenAutoFocus={(e) => e.preventDefault()}
                role="listbox"
                aria-label="Search suggestions">
                <Suggestions
                    searchSuggestions={transformedSuggestions}
                    recentSearches={getSessionJSONItem<string[]>(RECENT_SEARCH_KEY) || []}
                    closeAndNavigate={closeAndNavigate}
                    clearRecentSearches={clearRecentSearches}
                />
            </PopoverContent>
        </Popover>
    );
}
