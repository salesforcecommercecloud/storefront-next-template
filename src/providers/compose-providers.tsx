'use client';

import { type ComponentType, type PropsWithChildren, type ReactNode, useMemo } from 'react';

/**
 * A single provider definition as a tuple of [Component, props].
 * Each provider must accept `children`.
 */
type ProviderTuple<TProps extends object = Record<string, unknown>> = readonly [
    ComponentType<PropsWithChildren<TProps>>,
    Omit<TProps, 'children'> | undefined,
];

/**
 * A readonly list of provider tuples.
 * Heterogeneous provider types are allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProviderList = readonly ProviderTuple<any>[];

/**
 * Composes multiple providers into a single component tree,
 * applied from **outermost to innermost**.
 *
 * The providers are declared as tuples of `[Component, props]`.
 *
 * ### Example
 * ```tsx
 * <ComposeProviders
 *   providers={[
 *     [ConfigProvider, { config: appConfig }],
 *     [AuthProvider, { value: sessionData }],
 *     [ThemeProvider, { theme }],
 *   ]}
 * >
 *   <App />
 * </ComposeProviders>
 * ```
 *
 * Providers are composed right-to-left (last one wraps the children).
 *
 * This component also memoizes the composed tree to avoid unnecessary re-renders.
 */
export function ComposeProviders({ providers, children }: { providers: ProviderList; children: ReactNode }) {
    const composedTree = useMemo(() => {
        return providers.reduceRight<ReactNode>(
            (acc, [Component, props = {}]) => <Component {...(props as object)}>{acc}</Component>,
            children
        );
    }, [providers, children]);

    return <>{composedTree}</>;
}
