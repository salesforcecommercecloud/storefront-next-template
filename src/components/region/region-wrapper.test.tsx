import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RegionWrapper, type RegionDesignMetadata } from './region-wrapper';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';

vi.mock('@salesforce/storefront-next-runtime/design', () => ({
    isDesignModeActive: vi.fn(),
}));

type DecoratedProps = {
    region: ShopperExperienceTypes.Page['Region'];
    className?: string;
    designMetadata?: RegionDesignMetadata & {
        regionDirection: string;
        componentIds: string[];
    };
    children: React.ReactNode;
};

// props passed into decorator
const decoratedCalls: DecoratedProps[] = [];

vi.mock('@salesforce/storefront-next-runtime/design/react', () => ({
    createReactRegionDesignDecorator: () => {
        return (props: DecoratedProps) => {
            decoratedCalls.push(props);
            return <div data-testid="decorated-region">{props.children}</div>;
        };
    },
}));

import { isDesignModeActive } from '@salesforce/storefront-next-runtime/design';

const makeRegion = (id: string | undefined, compIds: string[]): ShopperExperienceTypes.Page['region'] => ({
    id,
    components: compIds.map((c) => ({ id: c })),
});

describe('RegionWrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        decoratedCalls.length = 0;
    });

    test('(runtime) renders plain RegionRenderer', () => {
        (isDesignModeActive as unknown as jest.Mock).mockReturnValue(false);
        const region = makeRegion('r1', ['a', 'b']);

        const { container } = render(
            <RegionWrapper region={region} className="x">
                <div data-testid="kid" />
            </RegionWrapper>
        );

        const root = screen.getByTestId('region');
        expect(root).toHaveAttribute('id', 'r1');
        expect(root).toHaveClass('region');
        expect(root).toHaveClass('x');
        expect(container.querySelector('.container')?.querySelector('[data-testid="kid"]')).not.toBeNull();
        expect(decoratedCalls).toHaveLength(0);
    });

    test('(design mode) decorated renderer gets metadata', () => {
        (isDesignModeActive as unknown as jest.Mock).mockReturnValue(true);
        const region = makeRegion('r2', ['x1', 'x2']);

        render(<RegionWrapper region={region}>child</RegionWrapper>);

        const decorated = screen.getByTestId('decorated-region');
        expect(decorated).toBeInTheDocument();

        const last = decoratedCalls[decoratedCalls.length - 1];
        expect(last.region.id).toEqual('r2');
        expect(last.designMetadata?.componentIds).toEqual(['x1', 'x2']);
        expect(last.designMetadata?.regionDirection).toEqual('column');
        expect(last.designMetadata?.componentTypeInclusions).toEqual([]);
        expect(last.designMetadata?.componentTypeExclusions).toEqual([]);
    });

    test('passes through custom inclusion/exclusion lists', () => {
        (isDesignModeActive as unknown as jest.Mock).mockReturnValue(true);
        const region = makeRegion('rM', ['cZ']);

        render(
            <RegionWrapper
                region={region}
                designMetadata={{
                    componentTypeExclusions: ['e1'],
                    componentTypeInclusions: ['i1'],
                }}>
                x
            </RegionWrapper>
        );

        const last = decoratedCalls.at(-1);
        expect(last?.designMetadata?.componentTypeExclusions).toEqual(['e1']);
        expect(last?.designMetadata?.componentTypeInclusions).toEqual(['i1']);
    });

    test('(design mode but no region id) falls back to plain renderer', () => {
        (isDesignModeActive as unknown as jest.Mock).mockReturnValue(true);
        const region = makeRegion(undefined, ['cx']);

        render(<RegionWrapper region={region}>y</RegionWrapper>);

        expect(screen.getByTestId('region')).toBeInTheDocument();
        expect(decoratedCalls).toHaveLength(0);
    });
});
