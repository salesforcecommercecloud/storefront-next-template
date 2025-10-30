'use client';

import { type FormEvent, type ReactElement, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import debounce from 'lodash.debounce';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search as SearchIcon } from 'lucide-react';
import uiStrings from '@/temp-ui-string';
import Suggestions from '@/components/search/suggestions';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { useTransformSearchSuggestions } from '@/hooks/use-transform-search-suggestions';
import { useConfig } from '@/config';

// Gap between search input and popover content dropdown
const POPOVER_CONTENT_OFFSET = 12;

export default function SearchBar(): ReactElement {
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
        enabled: query.trim().length >= 3,
    });

    const transformedSuggestions = useTransformSearchSuggestions(suggestions);

    useEffect(() => {
        queryRef.current = query;
        refetchRef.current = refetch;
    }, [query, refetch]);

    const debouncedRefetch = useMemo(() => {
        return debounce(() => {
            const currentQuery = queryRef.current;
            if (currentQuery.trim().length >= 3) {
                void refetchRef.current();
            }
        }, config.pages.search.suggestionsDebounce);
    }, [config.pages.search.suggestionsDebounce]);

    useEffect(() => {
        if (query.trim().length >= 3) {
            debouncedRefetch();
        } else {
            debouncedRefetch.cancel();
        }

        return () => {
            debouncedRefetch.cancel();
        };
    }, [query, debouncedRefetch]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (inputRef.current?.value?.trim()) {
                const searchQuery = inputRef.current.value;
                setShowSuggestions(false);
                void navigate(`/search?q=${encodeURIComponent(searchQuery)}`, {
                    state: { query: searchQuery },
                });
            }
        },
        [navigate]
    );

    const closeAndNavigate = useCallback(
        (link: string) => {
            setShowSuggestions(false);
            setQuery('');
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            void navigate(link);
        },
        [navigate]
    );

    const hasSuggestions =
        transformedSuggestions &&
        (transformedSuggestions.categorySuggestions?.length > 0 ||
            transformedSuggestions.productSuggestions?.length > 0);

    const shouldShowPopover = showSuggestions && hasSuggestions && query.trim().length >= 3;

    const handleInputFocus = useCallback(() => {
        if (hasSuggestions && query.trim().length >= 3) {
            setShowSuggestions(true);
        }
    }, [hasSuggestions, query]);

    useEffect(() => {
        if (suggestions && query.trim().length >= 3) {
            setShowSuggestions(!!hasSuggestions);
        } else if (query.trim().length < 3) {
            setShowSuggestions(false);
        }
    }, [suggestions, query, hasSuggestions]);

    return (
        <Popover open={shouldShowPopover} onOpenChange={setShowSuggestions}>
            <form onSubmit={handleSubmit} className="relative z-10">
                <div className="relative">
                    <PopoverTrigger asChild>
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder={uiStrings.header.searchPlaceholder}
                            className="w-full pl-10"
                            onChange={handleInputChange}
                            onFocus={handleInputFocus}
                            aria-label={uiStrings.header.searchPlaceholder}
                            aria-autocomplete="list"
                            aria-expanded={shouldShowPopover}
                            aria-haspopup="listbox"
                            role="combobox"
                        />
                    </PopoverTrigger>
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2" />
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
                {transformedSuggestions ? (
                    <Suggestions searchSuggestions={transformedSuggestions} closeAndNavigate={closeAndNavigate} />
                ) : (
                    <div className="p-4 text-center text-muted-foreground">No suggestions found</div>
                )}
            </PopoverContent>
        </Popover>
    );
}
