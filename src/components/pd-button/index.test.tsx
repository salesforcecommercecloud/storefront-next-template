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

// Mock decorators (minimal mocking to avoid testing them)
vi.mock('@/lib/decorators/component', () => ({
    Component: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/region-definition', () => ({
    RegionDefinition: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/attribute-definition', () => ({
    AttributeDefinition: () => () => {},
}));

// Import the component after mocks are set up
import PdButton from './index';

describe('PdButton Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderPdButton = (props = {}) => {
        return render(
            <MemoryRouter>
                <PdButton {...props} />
            </MemoryRouter>
        );
    };

    describe('Basic Rendering', () => {
        test('renders with default text', () => {
            renderPdButton();
            expect(screen.getByRole('button')).toHaveTextContent('Click me');
        });

        test('renders with custom text', () => {
            renderPdButton({ text: 'Custom Button' });
            expect(screen.getByRole('button')).toHaveTextContent('Custom Button');
        });

        test('renders as link when link prop is provided', () => {
            renderPdButton({ text: 'Link Button', link: '/test-link' });
            const link = screen.getByRole('link');
            expect(link).toHaveTextContent('Link Button');
            expect(link).toHaveAttribute('href', '/test-link');
        });

        test('renders as button when no link prop', () => {
            renderPdButton({ text: 'Regular Button' });
            expect(screen.getByRole('button')).toBeInTheDocument();
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });
    });

    describe('Border Radius Styles', () => {
        const borderRadiusTestCases = [
            { borderRadius: 'none', expectedClass: 'rounded-none' },
            { borderRadius: 'sm', expectedClass: 'rounded-sm' },
            { borderRadius: 'md', expectedClass: 'rounded-md' },
            { borderRadius: 'lg', expectedClass: 'rounded-lg' },
            { borderRadius: 'xl', expectedClass: 'rounded-xl' },
            { borderRadius: '2xl', expectedClass: 'rounded-2xl' },
            { borderRadius: 'full', expectedClass: 'rounded-full' },
        ];

        test.each(borderRadiusTestCases)(
            'applies $expectedClass for borderRadius=$borderRadius',
            ({ borderRadius, expectedClass }) => {
                renderPdButton({ borderRadius, text: 'Test' });
                const button = screen.getByRole('button');
                expect(button.className).toContain(expectedClass);
            }
        );
    });

    describe('Box Shadow Styles', () => {
        const boxShadowTestCases = [
            { boxShadow: 'none', shouldNotHaveShadow: true },
            { boxShadow: 'sm', expectedClass: 'shadow-sm' },
            { boxShadow: 'md', expectedClass: 'shadow-md' },
            { boxShadow: 'lg', expectedClass: 'shadow-lg' },
            { boxShadow: 'xl', expectedClass: 'shadow-xl' },
            { boxShadow: '2xl', expectedClass: 'shadow-2xl' },
        ];

        test.each(boxShadowTestCases)(
            'applies shadow for boxShadow=$boxShadow',
            ({ boxShadow, expectedClass, shouldNotHaveShadow }) => {
                renderPdButton({ boxShadow, text: 'Test' });
                const button = screen.getByRole('button');
                if (shouldNotHaveShadow) {
                    expect(button.className).not.toMatch(/shadow-(sm|md|lg|xl|2xl)/);
                } else {
                    expect(button.className).toContain(expectedClass);
                }
            }
        );
    });

    describe('Padding Styles', () => {
        test('applies horizontal padding', () => {
            renderPdButton({ paddingX: '6', text: 'Test' });
            const button = screen.getByRole('button');
            expect(button.className).toContain('px-6');
        });

        test('applies vertical padding', () => {
            renderPdButton({ paddingY: '3', text: 'Test' });
            const button = screen.getByRole('button');
            expect(button.className).toContain('py-3');
        });

        test('applies both horizontal and vertical padding', () => {
            renderPdButton({ paddingX: '8', paddingY: '4', text: 'Test' });
            const button = screen.getByRole('button');
            expect(button.className).toContain('px-8');
            expect(button.className).toContain('py-4');
        });
    });

    describe('Margin Styles', () => {
        test('applies no margin when margin is 0', () => {
            renderPdButton({ margin: '0', text: 'Test' });
            const button = screen.getByRole('button');
            expect(button.className).not.toMatch(/\bm-\d/);
        });

        test('applies margin when specified', () => {
            renderPdButton({ margin: '4', text: 'Test' });
            const button = screen.getByRole('button');
            expect(button.className).toContain('m-4');
        });
    });

    describe('Typography Styles', () => {
        const fontWeightTestCases = [
            { fontWeight: 'normal', expectedClass: 'font-normal' },
            { fontWeight: 'medium', expectedClass: 'font-medium' },
            { fontWeight: 'semibold', expectedClass: 'font-semibold' },
            { fontWeight: 'bold', expectedClass: 'font-bold' },
        ];

        test.each(fontWeightTestCases)(
            'applies $expectedClass for fontWeight=$fontWeight',
            ({ fontWeight, expectedClass }) => {
                renderPdButton({ fontWeight, text: 'Test' });
                const button = screen.getByRole('button');
                expect(button.className).toContain(expectedClass);
            }
        );

        const letterSpacingTestCases = [
            { letterSpacing: 'tighter', expectedClass: 'tracking-tighter' },
            { letterSpacing: 'tight', expectedClass: 'tracking-tight' },
            { letterSpacing: 'normal', expectedClass: 'tracking-normal' },
            { letterSpacing: 'wide', expectedClass: 'tracking-wide' },
            { letterSpacing: 'wider', expectedClass: 'tracking-wider' },
        ];

        test.each(letterSpacingTestCases)(
            'applies $expectedClass for letterSpacing=$letterSpacing',
            ({ letterSpacing, expectedClass }) => {
                renderPdButton({ letterSpacing, text: 'Test' });
                const button = screen.getByRole('button');
                expect(button.className).toContain(expectedClass);
            }
        );
    });

    describe('Hover Effects', () => {
        const hoverEffectTestCases = [
            { hoverEffect: 'default', shouldNotHaveEffect: true },
            { hoverEffect: 'scale', expectedClass: 'hover:scale-105' },
            { hoverEffect: 'opacity', expectedClass: 'hover:opacity-90' },
            { hoverEffect: 'shadow', expectedClass: 'hover:shadow-lg' },
        ];

        test.each(hoverEffectTestCases)(
            'applies hover effect for hoverEffect=$hoverEffect',
            ({ hoverEffect, expectedClass, shouldNotHaveEffect }) => {
                renderPdButton({ hoverEffect, text: 'Test' });
                const button = screen.getByRole('button');
                if (shouldNotHaveEffect) {
                    expect(button.className).not.toMatch(/hover:(scale|opacity|shadow)/);
                } else {
                    expect(button.className).toContain(expectedClass);
                }
            }
        );
    });

    describe('Custom className', () => {
        test('merges custom className with generated classes', () => {
            renderPdButton({ text: 'Test', className: 'custom-class' });
            const button = screen.getByRole('button');
            expect(button.className).toContain('custom-class');
            // Should still have default classes
            expect(button.className).toContain('rounded-md');
        });
    });

    describe('Combination of Styles', () => {
        test('applies multiple style attributes correctly', () => {
            renderPdButton({
                text: 'Styled Button',
                borderRadius: 'full',
                boxShadow: 'lg',
                paddingX: '8',
                paddingY: '4',
                margin: '2',
                fontWeight: 'bold',
                letterSpacing: 'wide',
                hoverEffect: 'scale',
            });
            const button = screen.getByRole('button');

            expect(button.className).toContain('rounded-full');
            expect(button.className).toContain('shadow-lg');
            expect(button.className).toContain('px-8');
            expect(button.className).toContain('py-4');
            expect(button.className).toContain('m-2');
            expect(button.className).toContain('font-bold');
            expect(button.className).toContain('tracking-wide');
            expect(button.className).toContain('hover:scale-105');
        });
    });
});
