import { Suspense, use, type ReactNode, type ComponentType } from 'react';

/**
 * Higher-order component that wraps a component with Suspense boundary.
 * This allows for granular streaming components that have their own suspense boundaries.
 *
 * The HOC can optionally accept a `resolve` property that takes a promise. When provided,
 * the promise is resolved using React's `use()` hook and the resolved data is passed
 * to the wrapped component as a `data` prop.
 *
 * Alternatively, the wrapped component can receive a `resolve` prop directly, which will
 * be resolved using the `use()` hook and passed as a `data` prop.
 * @returns A higher-order component that wraps the provided component with Suspense
 * @example
 * ```tsx
 * // Basic usage without promise resolution
 * const MyComponentWithSuspense = withSuspense(MyComponent, {
 *   fallback: <div>Loading...</div>
 * });
 *
 * // Usage with promise resolution at HOC level
 * const MyComponentWithSuspense = withSuspense(MyComponent, {
 *   fallback: <div>Loading...</div>,
 *   resolve: fetchUserData()
 * });
 *
 * // Usage with promise resolution as a prop
 * const MyComponentWithSuspense = withSuspense(MyComponent, {
 *   fallback: <div>Loading...</div>
 * });
 *
 * // The wrapped component receives the resolved data as a 'data' prop
 * function MyComponent({ data, ...otherProps }) {
 *   return <div>{data.name}</div>;
 * }
 *
 * // Usage in a component with resolve prop
 * function MyPage() {
 *   return (
 *     <div>
 *       <MyComponentWithSuspense resolve={fetchUserData()} />
 *     </div>
 *   );
 * }
 * ```
 */
export default function withSuspense<TProps extends Record<string, unknown> = Record<string, unknown>>(
    Component: ComponentType<TProps>,
    config: {
        /** Fallback component to show while loading */
        fallback?: ReactNode;
        /** Promise to resolve and pass as 'data' prop to the wrapped component */
        resolve?: Promise<unknown>;
    } = {}
) {
    const { fallback = <div>Loading...</div>, resolve: configResolve } = config;

    return function SuspenseWrapper(props: TProps & { resolve?: Promise<unknown> }) {
        const { resolve: propResolve, ...otherProps } = props;

        // Use prop resolve if provided, otherwise fall back to config resolve
        const resolve = propResolve || configResolve;

        return (
            <Suspense fallback={fallback}>
                <ComponentWithData Component={Component} resolve={resolve} props={otherProps as TProps} />
            </Suspense>
        );
    };
}

// Internal component that handles promise resolution
// eslint-disable-next-line react-refresh/only-export-components
function ComponentWithData<TProps extends Record<string, unknown>>({
    Component,
    resolve,
    props,
}: {
    Component: ComponentType<TProps>;
    resolve?: Promise<unknown>;
    props: TProps;
}) {
    // If no promise is provided, render the component with original props
    if (!resolve) {
        return <Component {...props} />;
    }

    // Use the promise and pass resolved data as 'data' prop
    const data = use(resolve);
    return <Component {...props} data={data} />;
}
