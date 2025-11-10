/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StoreLocatorProvider, { useStoreLocator } from './store-locator';

// Mock the store creation function
vi.mock('@/extensions/store-locator/stores/store-locator-store', () => ({
    createStoreLocatorStore: vi.fn(),
}));

// Mock the utils function
vi.mock('@/extensions/store-locator/utils', () => ({
    getCookieFromDocumentAs: vi.fn(),
    getSelectedStoreInfoCookieName: vi.fn(),
}));

// Test component that uses the hook
const TestComponent = () => {
    const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
    const setSelectedStoreInfo = useStoreLocator((s) => s.setSelectedStoreInfo);

    return (
        <div>
            <div data-testid="store-info">
                {selectedStoreInfo ? `${selectedStoreInfo.name} (${selectedStoreInfo.id})` : 'No store selected'}
            </div>
            <button
                data-testid="set-store"
                onClick={() =>
                    setSelectedStoreInfo({ id: 'test-store', name: 'Test Store', inventoryId: 'test-inventory' })
                }>
                Set Store
            </button>
        </div>
    );
};

// Test component that uses the hook outside provider
const TestComponentOutsideProvider = () => {
    try {
        const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
        return <div data-testid="store-info">{selectedStoreInfo?.name || 'No store'}</div>;
    } catch (error) {
        return <div data-testid="error">{(error as Error).message}</div>;
    }
};

describe('StoreLocatorProvider', () => {
    const mockCreateStoreLocatorStore = vi.fn();
    const mockGetSelectedStoreInfoFromDocument = vi.fn();
    const mockStore = {
        getState: vi.fn(),
        setState: vi.fn(),
        subscribe: vi.fn(),
        destroy: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        // Setup mocks
        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');
        const { getCookieFromDocumentAs, getSelectedStoreInfoCookieName } = await import(
            '@/extensions/store-locator/utils'
        );

        createStoreLocatorStore.mockImplementation(mockCreateStoreLocatorStore);
        getCookieFromDocumentAs.mockImplementation(mockGetSelectedStoreInfoFromDocument);
        getSelectedStoreInfoCookieName.mockReturnValue('selectedStoreInfo_test');

        mockCreateStoreLocatorStore.mockReturnValue(mockStore);
        mockGetSelectedStoreInfoFromDocument.mockReturnValue({
            id: 'initial-store',
            name: 'Initial Store',
            inventoryId: 'initial-inventory',
        });
    });

    it('renders children', () => {
        render(
            <StoreLocatorProvider>
                <div data-testid="child">Test Child</div>
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('creates store with initial selected store info', async () => {
        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');
        const { getCookieFromDocumentAs } = await import('@/extensions/store-locator/utils');

        const initialStoreInfo = {
            id: 'test-store',
            name: 'Test Store',
            inventoryId: 'test-inventory',
        };

        getCookieFromDocumentAs.mockReturnValue(initialStoreInfo);

        render(
            <StoreLocatorProvider>
                <div>Test</div>
            </StoreLocatorProvider>
        );

        expect(getCookieFromDocumentAs).toHaveBeenCalled();
        expect(createStoreLocatorStore).toHaveBeenCalledWith({
            selectedStoreInfo: initialStoreInfo,
        });
    });

    it('creates store with null when no initial store info', async () => {
        const { createStoreLocatorStore } = await import('@/extensions/store-locator/stores/store-locator-store');
        const { getCookieFromDocumentAs } = await import('@/extensions/store-locator/utils');

        getCookieFromDocumentAs.mockReturnValue(null);

        render(
            <StoreLocatorProvider>
                <div>Test</div>
            </StoreLocatorProvider>
        );

        expect(createStoreLocatorStore).toHaveBeenCalledWith({
            selectedStoreInfo: null,
        });
    });

    it('provides store context to children', () => {
        // Mock the store to return test data
        mockStore.getState.mockReturnValue({
            selectedStoreInfo: { id: 'test-store', name: 'Test Store', inventoryId: 'test-inventory' },
            setSelectedStoreInfo: vi.fn(),
        });

        render(
            <StoreLocatorProvider>
                <TestComponent />
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('store-info')).toHaveTextContent('Test Store (test-store)');
    });

    it('useStoreLocator throws error when used outside provider', () => {
        render(<TestComponentOutsideProvider />);

        expect(screen.getByTestId('error')).toHaveTextContent(
            'useStoreLocator must be used within StoreLocatorProvider'
        );
    });

    it('useStoreLocator works with different selectors', () => {
        const TestSelectorComponent = () => {
            const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
            const hasSelectedStore = useStoreLocator((s) => !!s.selectedStoreInfo);

            return (
                <div>
                    <div data-testid="store-info">{selectedStoreInfo?.name || 'No store'}</div>
                    <div data-testid="has-store">{hasSelectedStore ? 'Yes' : 'No'}</div>
                </div>
            );
        };

        // Mock the store to return test data
        mockStore.getState.mockReturnValue({
            selectedStoreInfo: { id: 'test-store', name: 'Test Store', inventoryId: 'test-inventory' },
        });

        render(
            <StoreLocatorProvider>
                <TestSelectorComponent />
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('store-info')).toHaveTextContent('Test Store');
        expect(screen.getByTestId('has-store')).toHaveTextContent('Yes');
    });

    it('useStoreLocator works with null selected store info', () => {
        // Mock the store to return null selected store info
        mockStore.getState.mockReturnValue({
            selectedStoreInfo: null,
        });

        render(
            <StoreLocatorProvider>
                <TestComponent />
            </StoreLocatorProvider>
        );

        expect(screen.getByTestId('store-info')).toHaveTextContent('No store selected');
    });
});
