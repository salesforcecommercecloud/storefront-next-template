/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useCheckAndExecutePendingAction } from './check-and-execute-pending-action';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('useCheckAndExecutePendingAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test component that uses the hook
    function TestComponent({
        actionName,
        shouldExecute,
        onMatch,
    }: {
        actionName: string;
        shouldExecute: (params: Record<string, unknown>) => boolean;
        onMatch: (params: Record<string, unknown>) => void | Promise<void>;
    }) {
        useCheckAndExecutePendingAction({
            actionName,
            shouldExecute,
            onMatch,
        });
        return <div>Test</div>;
    }

    const createRouter = (initialPath: string, component: React.ReactElement) => {
        return createMemoryRouter(
            [
                {
                    path: '*',
                    element: component,
                },
            ],
            {
                initialEntries: [initialPath],
            }
        );
    };

    test('executes action when URL params match action name and shouldExecute returns true', async () => {
        const mockOnMatch = vi.fn().mockResolvedValue(undefined);
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).toHaveBeenCalledWith({ productId: '123' });
            expect(mockOnMatch).toHaveBeenCalledWith({ productId: '123' });
        });
    });

    test('does not execute when action name does not match', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn();

        const router = createRouter(
            '/product/123?action=addToWishlist&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).not.toHaveBeenCalled();
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });

    test('does not execute when shouldExecute returns false', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn().mockReturnValue(false);

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"456"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).toHaveBeenCalledWith({ productId: '456' });
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });

    test('clears URL params on error', async () => {
        const mockOnMatch = vi.fn().mockImplementation(() => {
            return Promise.reject(new Error('Test error'));
        });
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        // Catch unhandled rejections - the hook throws the error after clearing URL
        const unhandledRejections: unknown[] = [];
        const originalUnhandledRejection = process.listeners('unhandledRejection');
        process.removeAllListeners('unhandledRejection');
        process.on('unhandledRejection', (error) => {
            unhandledRejections.push(error);
        });

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(
            () => {
                expect(mockOnMatch).toHaveBeenCalled();
                expect(mockNavigate).toHaveBeenCalledWith('/product/123', { replace: true });
            },
            { timeout: 2000 }
        );

        // Wait a bit for any async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Restore original handlers
        process.removeAllListeners('unhandledRejection');
        originalUnhandledRejection.forEach((listener) => {
            process.on('unhandledRejection', listener as (error: unknown) => void);
        });
    });

    test('clears URL params on invalid JSON', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn();

        const router = createRouter(
            '/product/123?action=addToCart&actionParams=invalid-json',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/product/123', { replace: true });
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });

    test('only executes once per mount', async () => {
        const mockOnMatch = vi.fn().mockResolvedValue(undefined);
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        const router = createRouter(
            '/product/123?action=addToCart&actionParams={"productId":"123"}',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        const { rerender } = render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockOnMatch).toHaveBeenCalledTimes(1);
        });

        // Rerender with same URL params
        rerender(<RouterProvider router={router} />);

        await waitFor(() => {
            // Should still only be called once
            expect(mockOnMatch).toHaveBeenCalledTimes(1);
        });
    });

    test('handles action params with multiple fields', async () => {
        const mockOnMatch = vi.fn().mockResolvedValue(undefined);
        const mockShouldExecute = vi.fn().mockReturnValue(true);

        const actionParams = JSON.stringify({
            productId: '123',
            variantId: '456',
            quantity: 2,
        });

        const router = createRouter(
            `/product/123?action=addToCart&actionParams=${encodeURIComponent(actionParams)}`,
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).toHaveBeenCalledWith({
                productId: '123',
                variantId: '456',
                quantity: 2,
            });
            expect(mockOnMatch).toHaveBeenCalledWith({
                productId: '123',
                variantId: '456',
                quantity: 2,
            });
        });
    });

    test('does not execute when actionParams is missing', async () => {
        const mockOnMatch = vi.fn();
        const mockShouldExecute = vi.fn();

        const router = createRouter(
            '/product/123?action=addToCart',
            <TestComponent actionName="addToCart" shouldExecute={mockShouldExecute} onMatch={mockOnMatch} />
        );

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(mockShouldExecute).not.toHaveBeenCalled();
            expect(mockOnMatch).not.toHaveBeenCalled();
        });
    });
});
