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
import { MemoryRouter } from 'react-router';

// Mock the hero image import
vi.mock('/images/hero-cube.webp', () => ({
    default: '/mock-hero-image.png',
}));

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
        return render(
            <MemoryRouter>
                <Hero {...props} />
            </MemoryRouter>
        );
    };

    describe('Content Rendering', () => {
        const contentTestCases = [
            {
                description: 'renders default content',
                props: {},
                expectedTitle: 'Shop Now',
                expectedCta: 'Shop Now',
                expectedLink: '/category/root',
                expectedImageSrc: '/mock-hero-image.png',
                expectedImageAlt: '',
                hasSubtitle: false,
            },
            {
                description: 'renders custom content',
                props: {
                    title: 'Custom Title',
                    subtitle: 'Custom Subtitle',
                    ctaText: 'Learn More',
                    ctaLink: '/custom',
                    imageUrl: { url: '/custom.jpg' },
                    imageAlt: 'Custom Alt',
                },
                expectedTitle: 'Custom Title',
                expectedCta: 'Learn More',
                expectedLink: '/custom',
                expectedImageSrc: '/custom.jpg',
                expectedImageAlt: 'Custom Alt',
                hasSubtitle: true,
                expectedSubtitle: 'Custom Subtitle',
            },
        ];

        test.each(contentTestCases)(
            '$description',
            ({
                props,
                expectedTitle,
                expectedCta,
                expectedLink,
                expectedImageSrc,
                expectedImageAlt,
                hasSubtitle,
                expectedSubtitle,
            }) => {
                renderHero(props);

                // Test title
                expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(expectedTitle);

                // Test CTA and link together to avoid duplicate text issue
                const link = screen.getByRole('link');
                expect(link).toHaveTextContent(expectedCta);
                expect(link).toHaveAttribute('href', expectedLink);

                // Test image
                const image =
                    expectedImageAlt === ''
                        ? screen.getByRole('presentation')
                        : screen.getByRole('img', { name: expectedImageAlt });
                expect(image).toHaveAttribute('src', expectedImageSrc);
                expect(image).toHaveAttribute('alt', expectedImageAlt);
                expect(image).toHaveAttribute('fetchpriority', 'high');

                if (hasSubtitle && expectedSubtitle) {
                    expect(screen.getByText(expectedSubtitle)).toBeInTheDocument();
                } else {
                    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
                }
            }
        );
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

            const image = screen.getByRole('img');
            expect(image).toHaveStyle({ objectPosition: expectedPosition });
        });
    });

    describe('Component Behavior', () => {
        test('renders all required elements', () => {
            renderHero();

            expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
            expect(screen.getByRole('presentation')).toBeInTheDocument();
            expect(screen.getByRole('link')).toBeInTheDocument();
        });

        test('subtitle is conditionally rendered', () => {
            const { rerender } = renderHero();
            expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();

            rerender(
                <MemoryRouter>
                    <Hero subtitle="Now with subtitle" />
                </MemoryRouter>
            );
            expect(screen.getByText('Now with subtitle')).toBeInTheDocument();
        });
    });
});
