import { type FC, Suspense } from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { Component } from './component';

vi.mock('@/lib/registry', () => ({
    registry: {
        getFallback: vi.fn(),
        getMetadata: vi.fn(),
        getComponent: vi.fn(),
        preload: vi.fn(),
    },
}));

import { registry } from '@/lib/registry';

type DataMap = Record<string, Promise<unknown>>;

const deferred = <T,>() => {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

describe('Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('shows custom fallback while pending, then renders Dynamic with resolved data and metadata', async () => {
        const Fallback = () => <div data-testid="inner-fallback" />;
        (registry.getFallback as any).mockReturnValue(Fallback);
        (registry.getMetadata as any).mockReturnValue({ typeId: 'hero', name: 'Hero' });

        let lastProps: Record<string, unknown> | undefined;
        const Dynamic: FC<any> = (p) => {
            lastProps = p;
            return <div data-testid="dynamic" />;
        };
        (registry.getComponent as any).mockReturnValue(Dynamic);

        const component: ShopperExperience.schemas['Component'] = {
            id: 'c1',
            typeId: 'hero',
            data: { foo: 1 } as any,
        };
        const d = deferred<unknown>();
        const map: DataMap = { c1: d.promise };

        render(
            <Component
                component={component}
                componentData={Promise.resolve(map)}
                className="cls"
                regionId="main-region"
            />
        );

        expect(screen.getByTestId('inner-fallback')).toBeInTheDocument();

        const resolved = { payload: 42 };
        d.resolve(resolved);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic')).toBeInTheDocument();
            expect(screen.queryByTestId('inner-fallback')).not.toBeInTheDocument();
        });

        expect(lastProps?.foo).toBe(1);
        expect(lastProps?.className).toBe('cls');
        expect(lastProps?.data).toEqual(resolved);
        expect(lastProps?.designMetadata).toEqual({
            id: component.id,
            isFragment: false,
            isVisible: false,
            name: 'Hero',
        });
    });

    test('renders immediately with data=undefined when no componentData is given', async () => {
        (registry.getFallback as any).mockReturnValue(undefined);
        (registry.getMetadata as any).mockReturnValue({ typeId: 'hero', name: 'H2' });

        let lastProps: Record<string, unknown> | undefined;
        const Dynamic: FC<any> = (p) => {
            lastProps = p;
            return <div data-testid="dyn-no-data" />;
        };
        (registry.getComponent as any).mockReturnValue(Dynamic);

        const component: ShopperExperience.schemas['Component'] = { id: 'c2', typeId: 'hero' };

        render(<Component component={component} regionId="main-region" />);

        expect(await screen.findByTestId('dyn-no-data')).toBeInTheDocument();
        expect(lastProps?.data).toBeUndefined();
        expect(lastProps?.designMetadata).toEqual({
            id: component.id,
            isFragment: false,
            isVisible: false,
            name: 'H2',
        });
    });

    test('uses default <div/> fallback when no custom fallback is registered', async () => {
        (registry.getFallback as any).mockReturnValue(undefined);
        (registry.getMetadata as any).mockReturnValue(undefined);

        const Dynamic: FC = () => <div data-testid="dyn-default" />;
        (registry.getComponent as any).mockReturnValue(Dynamic);

        const component: ShopperExperience.schemas['Component'] = { id: 'c3', typeId: 'hero' };
        const d = deferred<unknown>();
        const map: DataMap = { c3: d.promise };

        const { container } = render(
            <Component component={component} componentData={Promise.resolve(map)} regionId="main-region" />
        );

        // Default fallback is a bare <div>; just assert something rendered and Dynamic not yet
        expect(container.firstElementChild).not.toBeNull();
        expect(screen.queryByTestId('dyn-default')).toBeNull();

        d.resolve({ ok: true });
        await waitFor(() => expect(screen.getByTestId('dyn-default')).toBeInTheDocument());
    });

    test('throws preload promise when DynamicComponent missing, then renders after preload resolves', async () => {
        (registry.getComponent as any).mockReturnValue(undefined);
        const preloadGate = deferred<void>();
        (registry.preload as any).mockReturnValue(preloadGate.promise);
        (registry.getMetadata as any).mockReturnValue({ name: 'Post' });

        const DynamicAfter: FC<any> = () => <div data-testid="dyn-after-preload" />;

        const component: ShopperExperience.schemas['Component'] = { id: 'cp', typeId: 'hero' };

        render(
            <Suspense fallback={<div data-testid="outer-fallback" />}>
                <Component component={component} regionId="main-region" />
            </Suspense>
        );

        expect(screen.getByTestId('outer-fallback')).toBeInTheDocument();

        (registry.getComponent as any).mockReturnValue(DynamicAfter);
        preloadGate.resolve();

        await waitFor(() => {
            expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
            expect(screen.getByTestId('dyn-after-preload')).toBeInTheDocument();
        });
    });

    test('selects the correct promise from the data map using component.id', async () => {
        (registry.getFallback as any).mockReturnValue(undefined);
        (registry.getMetadata as any).mockReturnValue({ name: 'Meta' });

        let seenData: unknown;
        const Dynamic: FC<any> = (p) => {
            seenData = p.data;
            return <div data-testid="dyn-map" />;
        };
        (registry.getComponent as any).mockReturnValue(Dynamic);

        const compB: ShopperExperience.schemas['Component'] = { id: 'B', typeId: 'hero' };
        const dA = deferred<unknown>();
        const dB = deferred<unknown>();
        const map: DataMap = { A: dA.promise, B: dB.promise };

        render(<Component component={compB} componentData={Promise.resolve(map)} regionId="main-region" />);

        dB.resolve({ v: 'B' });
        await waitFor(() => expect(screen.getByTestId('dyn-map')).toBeInTheDocument());
        expect(seenData).toEqual({ v: 'B' });
    });
});
