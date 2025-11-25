'use client';

import type React from 'react';
import { cn } from '@/lib/utils';
import { DynamicImage } from '@/components/dynamic-image';

interface Suggestion {
    name: string;
    link: string;
    type: string;
    image?: string;
    parentCategoryName?: string;
}

interface SuggestionsProps {
    suggestions?: Suggestion[];
    closeAndNavigate?: (link: string) => void;
    className?: string;
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, closeAndNavigate, className }) => {
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    const handleClick = (link: string) => {
        if (closeAndNavigate) {
            closeAndNavigate(link);
        }
    };

    return (
        <div data-testid="sf-suggestion" className={cn('space-y-0', className)}>
            <div className="-mx-4">
                {suggestions.map((suggestion) => (
                    <button
                        key={suggestion.link}
                        onMouseDown={() => handleClick(suggestion.link)}
                        className="w-full flex justify-start items-center px-4 py-0 hover:bg-accent hover:text-accent-foreground transition-colors text-base mt-0">
                        <div className="flex items-center">
                            <div className="w-10 h-8 mr-4 rounded-full bg-transparent flex items-center justify-center overflow-hidden shrink-0">
                                {suggestion.image ? (
                                    <DynamicImage
                                        src={`${suggestion.image}[?sw={width}&q=60]`}
                                        alt={suggestion.name}
                                        className="w-full h-full"
                                        imageProps={{
                                            className: 'w-full h-full object-cover rounded-full',
                                        }}
                                        loading="eager"
                                    />
                                ) : null}
                            </div>
                            <div className="text-left">
                                <span className="text-base font-medium text-foreground">{suggestion.name}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Suggestions;
