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
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Mock decorators (minimal mocking to avoid testing them)
vi.mock('@/lib/decorators/component', () => ({
    Component: () => (target: any) => target,
}));

vi.mock('@/lib/decorators', () => ({
    RegionDefinition: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/attribute-definition', () => ({
    AttributeDefinition: () => () => {},
}));

// Import the component after mocks are set up
import Hero from './index';

describe('Hero Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderHero = (props = {}) => {
        const router = createMemoryRouter(
            [
                {
                    path: '*',
                    element: (
                        <AllProvidersWrapper>
                            <Hero {...props} />
                        </AllProvidersWrapper>
                    ),
                },
            ],
            { initialEntries: ['/'] }
        );
        return render(<RouterProvider router={router} />);
    };

    describe('Content Rendering', () => {
        test('renders empty placeholder state with no props', () => {
            const { container } = renderHero();

            expect(screen.queryByRole('heading')).not.toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
            expect(screen.queryByRole('link')).not.toBeInTheDocument();

            // Placeholder background should be present instead of an image
            expect(container.querySelector('.bg-muted')).toBeInTheDocument();
        });

        test('renders custom content', () => {
            renderHero({
                title: 'Custom Title',
                subtitle: 'Custom Subtitle',
                ctaText: 'Learn More',
                ctaLink: '/custom',
                imageUrl: { url: '/custom.jpg' },
                imageAlt: 'Custom Alt',
            });

            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Custom Title');

            const link = screen.getByRole('link');
            expect(link).toHaveTextContent('Learn More');
            expect(link).toHaveAttribute('href', '/global/en-GB/custom');

            const image = screen.getByRole('img', { name: 'Custom Alt' });
            expect(image).toHaveAttribute('src', '/custom.jpg');
            expect(image).toHaveAttribute('alt', 'Custom Alt');
            expect(image).toHaveAttribute('fetchpriority', 'high');

            expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
        });

        test('renders image with empty alt when imageAlt is not provided', () => {
            renderHero({ imageUrl: { url: '/test.jpg' } });

            const image = screen.getByRole('presentation');
            expect(image).toHaveAttribute('src', '/test.jpg');
            expect(image).toHaveAttribute('alt', '');
        });

        test('does not render CTA when only ctaText is provided without ctaLink', () => {
            renderHero({ ctaText: 'Click Me' });
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });

        test('does not render CTA when only ctaLink is provided without ctaText', () => {
            renderHero({ ctaLink: '/somewhere' });
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });
    });

    describe('Focal Point Behavior', () => {
        const focalPointTestCases = [
            {
                description: 'uses custom focal point',
                imageUrl: { url: '/test.jpg', focal_point: { x: '30', y: '70' } },
                expectedPosition: '30% 70%',
            },
            {
                description: 'defaults to center when no focal point',
                imageUrl: { url: '/test.jpg' },
                expectedPosition: '50% 50%',
            },
            {
                description: 'handles partial focal point (x only)',
                imageUrl: { url: '/test.jpg', focal_point: { x: '25' } },
                expectedPosition: '25% 50%',
            },
            {
                description: 'handles partial focal point (y only)',
                imageUrl: { url: '/test.jpg', focal_point: { y: '75' } },
                expectedPosition: '50% 75%',
            },
            {
                description: 'handles empty focal point object',
                imageUrl: { url: '/test.jpg', focal_point: {} },
                expectedPosition: '50% 50%',
            },
        ];

        test.each(focalPointTestCases)('$description', ({ imageUrl, expectedPosition }) => {
            renderHero({ imageUrl });

            const image = screen.getByRole('presentation');
            expect(image).toHaveStyle({ objectPosition: expectedPosition });
        });
    });

    describe('Component Behavior', () => {
        test('renders all elements when fully configured', () => {
            renderHero({
                title: 'Test Title',
                imageUrl: { url: '/test.jpg' },
                imageAlt: 'Test image',
                ctaText: 'Go',
                ctaLink: '/go',
            });

            expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
            expect(screen.getByRole('img', { name: 'Test image' })).toBeInTheDocument();
            expect(screen.getByRole('link')).toBeInTheDocument();
        });

        test('subtitle is conditionally rendered', () => {
            renderHero({ title: 'Test' });
            expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();

            renderHero({ title: 'Test', subtitle: 'Now with subtitle' });
            expect(screen.getByText('Now with subtitle')).toBeInTheDocument();
        });
    });
});
