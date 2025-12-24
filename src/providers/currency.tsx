import { createContext, useContext, type PropsWithChildren } from 'react';

const CurrencyContext = createContext<string | undefined>(undefined);

export function CurrencyProvider({ value, children }: PropsWithChildren<{ value: string }>) {
    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * React hook to get currency from context (for use in components).
 * Currency is automatically derived from the current locale.
 * @returns The current currency code
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency(): string | undefined {
    const currency = useContext(CurrencyContext);

    return currency ?? undefined;
}
