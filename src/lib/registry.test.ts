import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createReactComponentRegistry, registry } from './registry';
import { ComponentRegistry } from '@salesforce/storefront-next-runtime/design';
import { createReactAdapter } from '@salesforce/storefront-next-runtime/design/react';

// Mock the external dependencies
vi.mock('@salesforce/storefront-next-runtime/design', () => ({
    ComponentRegistry: vi.fn().mockImplementation(function (this: any, config: any) {
        this.config = config;
    }),
}));

vi.mock('@salesforce/storefront-next-runtime/design/react', () => ({
    createReactAdapter: vi.fn(() => ({
        createLazyComponent: vi.fn(),
        isDesignModeActive: vi.fn(),
        getDesignDecorator: vi.fn(),
    })),
}));

describe('registry module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createReactComponentRegistry', () => {
        it('creates a ComponentRegistry instance with React adapter', () => {
            const testRegistry = createReactComponentRegistry<{ test: string }>();

            expect(ComponentRegistry).toHaveBeenCalledWith({
                adapter: expect.any(Object),
            });
            expect(createReactAdapter).toHaveBeenCalledWith();
            expect(testRegistry).toBeInstanceOf(ComponentRegistry);
        });

        it('creates a new instance each time it is called', () => {
            const registry1 = createReactComponentRegistry();
            const registry2 = createReactComponentRegistry();

            expect(registry1).not.toBe(registry2);
            expect(ComponentRegistry).toHaveBeenCalledTimes(2);
        });

        it('supports generic type parameters', () => {
            interface TestProps {
                title: string;
                count: number;
            }

            const typedRegistry = createReactComponentRegistry<TestProps>();
            expect(typedRegistry).toBeInstanceOf(ComponentRegistry);
            expect(createReactAdapter).toHaveBeenCalledWith();
        });
    });

    describe('registry singleton', () => {
        it('exports a singleton registry instance', () => {
            expect(registry).toBeDefined();
            expect(registry).toBeInstanceOf(ComponentRegistry);
        });
    });

    describe('React adapter integration', () => {
        it('passes adapter to ComponentRegistry constructor', () => {
            const mockAdapter = {
                createLazyComponent: vi.fn(),
                isDesignModeActive: vi.fn(),
                getDesignDecorator: vi.fn(),
            };
            (createReactAdapter as Mock).mockReturnValue(mockAdapter);

            createReactComponentRegistry();

            expect(ComponentRegistry).toHaveBeenCalledWith({
                adapter: mockAdapter,
            });
        });
    });
});
