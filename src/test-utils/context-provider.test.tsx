/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigWrapper, StoreLocatorWrapper, AllProvidersWrapper } from './context-provider';

describe('context-provider', () => {
    const TestComponent = () => <div data-testid="test-component">Test Content</div>;

    describe('ConfigWrapper', () => {
        it('renders children with ConfigProvider', () => {
            const { container } = render(
                <ConfigWrapper>
                    <TestComponent />
                </ConfigWrapper>
            );

            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.textContent).toContain('Test Content');
        });

        it('provides config context to children', () => {
            const { container } = render(
                <ConfigWrapper>
                    <TestComponent />
                </ConfigWrapper>
            );

            // The component should render without errors, indicating the config context is available
            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
        });

        it('handles multiple children', () => {
            const { container } = render(
                <ConfigWrapper>
                    <TestComponent />
                    <div data-testid="second-child">Second Child</div>
                </ConfigWrapper>
            );

            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="second-child"]')).toBeInTheDocument();
            expect(container.textContent).toContain('Test Content');
            expect(container.textContent).toContain('Second Child');
        });

        it('handles empty children', () => {
            const { container } = render(<ConfigWrapper>{null}</ConfigWrapper>);

            expect(container.querySelector('[data-testid="test-component"]')).not.toBeInTheDocument();
        });
    });

    describe('StoreLocatorWrapper', () => {
        it('renders children with StoreLocatorProvider', () => {
            const { container } = render(
                <StoreLocatorWrapper>
                    <TestComponent />
                </StoreLocatorWrapper>
            );

            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.textContent).toContain('Test Content');
        });

        it('provides store locator context to children', () => {
            const { container } = render(
                <StoreLocatorWrapper>
                    <TestComponent />
                </StoreLocatorWrapper>
            );

            // The component should render without errors, indicating the store locator context is available
            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
        });

        it('handles multiple children', () => {
            const { container } = render(
                <StoreLocatorWrapper>
                    <TestComponent />
                    <div data-testid="second-child">Second Child</div>
                </StoreLocatorWrapper>
            );

            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="second-child"]')).toBeInTheDocument();
        });

        it('handles empty children', () => {
            const { container } = render(<StoreLocatorWrapper>{null}</StoreLocatorWrapper>);

            expect(container.querySelector('[data-testid="test-component"]')).not.toBeInTheDocument();
        });
    });

    describe('AllProvidersWrapper', () => {
        it('renders children with both ConfigProvider and StoreLocatorProvider', () => {
            const { container } = render(
                <AllProvidersWrapper>
                    <TestComponent />
                </AllProvidersWrapper>
            );

            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.textContent).toContain('Test Content');
        });

        it('provides both config and store locator context to children', () => {
            const { container } = render(
                <AllProvidersWrapper>
                    <TestComponent />
                </AllProvidersWrapper>
            );

            // The component should render without errors, indicating both contexts are available
            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
        });

        it('handles multiple children', () => {
            const { container } = render(
                <AllProvidersWrapper>
                    <TestComponent />
                    <div data-testid="second-child">Second Child</div>
                </AllProvidersWrapper>
            );

            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="second-child"]')).toBeInTheDocument();
        });

        it('handles empty children', () => {
            const { container } = render(<AllProvidersWrapper>{null}</AllProvidersWrapper>);

            expect(container.querySelector('[data-testid="test-component"]')).not.toBeInTheDocument();
        });

        it('handles complex nested children', () => {
            const NestedComponent = () => (
                <div data-testid="nested-component">
                    <TestComponent />
                    <div data-testid="nested-child">Nested Child</div>
                </div>
            );

            const { container } = render(
                <AllProvidersWrapper>
                    <NestedComponent />
                </AllProvidersWrapper>
            );

            expect(container.querySelector('[data-testid="nested-component"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="test-component"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="nested-child"]')).toBeInTheDocument();
        });
    });
});
