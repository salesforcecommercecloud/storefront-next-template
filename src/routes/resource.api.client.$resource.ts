/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ClientLoaderFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type { InstanceMethodKeysOf } from '+types/lang';
import { decodeBase64Url } from '@/lib/url';
import { extractResponseError } from '@/lib/utils';
import createClient, { type CommerceSdkCtorFromKey, type CommerceSdkKeyMap } from '@/lib/scapi';

function load<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
>({
    params,
    context,
}: LoaderFunctionArgs): Promise<
    | {
          success: true;
          data: Awaited<R>;
      }
    | {
          success: false;
          error?: string;
      }
> {
    const resource = JSON.parse(decodeBase64Url(params.resource ?? '[]')) as [C, M, P];
    if (!Array.isArray(resource) || resource.length !== 3) {
        throw new TypeError('Unexpected resource format');
    }
    return createClient(context)
        ?.[resource[0]]?.[resource[1]]?.(...(resource[2] as any[]))
        .then(
            (data: Awaited<R>) => ({
                success: true,
                data,
            }),
            (reason: unknown) => {
                const reasonMessage = reason instanceof Error ? reason.message : 'Unknown error';
                return extractResponseError(reason).then(
                    ({ responseMessage }) => {
                        return {
                            success: false,
                            error: responseMessage,
                        };
                    },
                    () => {
                        return {
                            success: false,
                            ...(reason ? { error: reasonMessage } : {}),
                        };
                    }
                );
            }
        );
}

/**
 * A React Router server loader that's part of our Commerce SDK fetch API trinity. The trinity consists of this route's
 * loaders, the `fetch` service, and the `useFetch` hook. The purpose of these three entities is to simplify and
 * centralize the way to interact with the Commerce SDK methods right inside this loader function. This makes this
 * route virtually the heart of the Commerce SDK access/interaction.
 *
 * The loader expects a Commerce SDK client's name, a method name and method parameters to be passed as route
 * parameters. It then instantiates the targeted client, invokes the method and returns a response. The response is
 * wrapped in an object with a `success` property indicating the success of the operation and - depending on the success
 * state - either a `data` or an `error` property. So usually that loader acts in a fail-safe manner.
 * @see {@link import('react-router').ClientLoaderFunction}
 * @see {@link import('@/hooks/use-fetch.ts').useFetch}
 * @see {@link import('@/lib/scapi.ts').default}
 */
export function loader<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
>(args: LoaderFunctionArgs): Promise<Awaited<ReturnType<typeof load<R, C, M, P>>>> {
    return load<R, C, M, P>(args);
}

/**
 * A React Router client loader that's part of our Commerce SDK fetch API trinity. The trinity consists of this route's
 * loaders, the `fetch` service, and the `useFetch` hook. The purpose of these three entities is to simplify and
 * centralize the way to interact with the Commerce SDK methods right inside this loader function. This makes this
 * route virtually the heart of the Commerce SDK access/interaction.
 *
 * The loader expects a Commerce SDK client's name, a method name and method parameters to be passed as route
 * parameters. It then instantiates the targeted client, invokes the method and returns a response. The response is
 * wrapped in an object with a `success` property indicating the success of the operation and - depending on the success
 * state - either a `data` or an `error` property. So usually that loader acts in a fail-safe manner.
 * @see {@link import('react-router').ClientLoaderFunction}
 * @see {@link import('@/hooks/use-fetch.ts').useFetch}
 * @see {@link import('@/lib/scapi.ts').default}
 */
export function clientLoader<
    R extends ReturnType<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
    C extends CommerceSdkKeyMap,
    M extends InstanceMethodKeysOf<CommerceSdkCtorFromKey<C>>,
    P extends Parameters<
        InstanceType<CommerceSdkCtorFromKey<C>>[M] extends (...a: any[]) => any
            ? InstanceType<CommerceSdkCtorFromKey<C>>[M]
            : never
    >,
>(args: ClientLoaderFunctionArgs): Promise<Awaited<ReturnType<typeof load<R, C, M, P>>>> {
    return load<R, C, M, P>(args);
}
