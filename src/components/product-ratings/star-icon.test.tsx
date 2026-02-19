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

import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { StarIcon } from './star-icon';

describe('StarIcon', () => {
    describe('basic rendering', () => {
        test('renders an SVG element', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });

        test('renders with correct viewBox', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
        });

        test('renders with fill currentColor', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('fill', 'currentColor');
        });
    });

    describe('filled state', () => {
        test('applies yellow color when filled is true', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-rating');
        });

        test('applies muted color when filled is false', () => {
            const { container } = render(<StarIcon opacity={1} filled={false} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-muted-foreground/30');
        });

        test('does not have muted color when filled is true', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).not.toHaveClass('text-muted-foreground/30');
        });

        test('does not have yellow color when filled is false', () => {
            const { container } = render(<StarIcon opacity={1} filled={false} />);
            const svg = container.querySelector('svg');
            expect(svg).not.toHaveClass('text-rating');
        });
    });

    describe('opacity prop', () => {
        test('applies full opacity when opacity is 1', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveStyle({ opacity: '1' });
        });

        test('applies zero opacity when opacity is 0', () => {
            const { container } = render(<StarIcon opacity={0} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveStyle({ opacity: '0' });
        });

        test('applies partial opacity when opacity is 0.5', () => {
            const { container } = render(<StarIcon opacity={0.5} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveStyle({ opacity: '0.5' });
        });

        test('applies decimal opacity correctly', () => {
            const { container } = render(<StarIcon opacity={0.75} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveStyle({ opacity: '0.75' });
        });

        test('works with various opacity values', () => {
            const opacities = [0, 0.2, 0.4, 0.6, 0.8, 1];

            opacities.forEach((opacity) => {
                const { container } = render(<StarIcon opacity={opacity} filled={true} />);
                const svg = container.querySelector('svg');
                expect(svg).toHaveStyle({ opacity: opacity.toString() });
            });
        });
    });

    describe('className prop', () => {
        test('applies custom className', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} className="custom-class" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('custom-class');
        });

        test('preserves base classes with custom className', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} className="w-8 h-8" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-rating', 'w-8', 'h-8');
        });

        test('can override color with custom className', () => {
            // eslint-disable-next-line custom/color-linter
            const { container } = render(<StarIcon opacity={1} filled={true} className="text-red-500" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-red-500');
        });

        test('applies multiple custom classes', () => {
            // eslint-disable-next-line custom/color-linter
            const { container } = render(<StarIcon opacity={1} filled={true} className="w-6 h-6 text-blue-400" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('w-6', 'h-6', 'text-blue-400');
        });
    });

    describe('additional SVG props', () => {
        test('forwards aria-hidden attribute', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} aria-hidden="true" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('aria-hidden', 'true');
        });

        test('forwards data attributes', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} data-testid="star-icon" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('data-testid', 'star-icon');
        });

        test('forwards custom props', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} role="img" aria-label="Star" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('role', 'img');
            expect(svg).toHaveAttribute('aria-label', 'Star');
        });
    });

    describe('ref forwarding', () => {
        test('forwards ref to SVG element', () => {
            const ref = { current: null };
            render(<StarIcon opacity={1} filled={true} ref={ref as any} />);
            expect(ref.current).toBeInstanceOf(SVGSVGElement);
        });
    });

    describe('combined states', () => {
        test('renders filled star with partial opacity', () => {
            const { container } = render(<StarIcon opacity={0.6} filled={true} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-rating');
            expect(svg).toHaveStyle({ opacity: '0.6' });
        });

        test('renders unfilled star with partial opacity', () => {
            const { container } = render(<StarIcon opacity={0.3} filled={false} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-muted-foreground/30');
            expect(svg).toHaveStyle({ opacity: '0.3' });
        });

        test('renders filled star with custom size', () => {
            const { container } = render(<StarIcon opacity={1} filled={true} className="w-12 h-12" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-rating', 'w-12', 'h-12');
            expect(svg).toHaveStyle({ opacity: '1' });
        });

        test('renders unfilled star with zero opacity', () => {
            const { container } = render(<StarIcon opacity={0} filled={false} />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveClass('text-muted-foreground/30');
            expect(svg).toHaveStyle({ opacity: '0' });
        });
    });
});
