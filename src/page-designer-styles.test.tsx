import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PageDesignerStyles } from './page-designer-styles';
import { usePageDesignerMode } from '@salesforce/storefront-next-runtime/design/react/core';

const mockCssImport = vi.fn();

vi.mock(import('@salesforce/storefront-next-runtime/design/styles.css'), () => {
    mockCssImport();

    return { default: {} };
});

vi.mock('@salesforce/storefront-next-runtime/design/react/core', () => ({
    usePageDesignerMode: vi.fn(() => ({ isDesignMode: true })),
}));

describe('Page Designer Styles Component', () => {
    beforeEach(() => {
        mockCssImport.mockClear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('when in design mode', () => {
        it('should import the Page Designer styles', async () => {
            render(<PageDesignerStyles />);

            await waitFor(() => {
                expect(mockCssImport).toHaveBeenCalled();
            });
        });
    });

    describe('when not in design mode', () => {
        it('should not import the Page Designer styles', () => {
            (usePageDesignerMode as Mock).mockReturnValue({ isDesignMode: false });
            render(<PageDesignerStyles />);

            expect(mockCssImport).not.toHaveBeenCalled();
        });
    });
});
