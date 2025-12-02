import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { createComponentTestBed, TEST_PAGE } from '../../test/component-test-bed';
import { waitFor } from '@testing-library/react';

const TestComponent = ({ children }: React.PropsWithChildren) => <>{children}</>;

describe('PageDesignerPage', () => {
    const testBed = createComponentTestBed(() => ({}));

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('when in design mode', () => {
        let spy: Mock;

        beforeEach(() => {
            spy = vi.fn();
            testBed.state.mode = 'EDIT';
            testBed.afterHostCreated((host) => {
                host.on('ClientPageChanged', spy);
            });
        });

        it('should notify the host of the page change', async () => {
            await testBed.render(TestComponent);

            await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ page: TEST_PAGE })), {
                timeout: 1_000,
            });
        });
    });

    describe('when not in design mode', () => {
        let spy: Mock;

        beforeEach(() => {
            spy = vi.fn();
            testBed.state.mode = null;
            testBed.afterHostCreated((host) => {
                host.on('ClientPageChanged', spy);
            });
        });

        it('should not notify the host of the page change', async () => {
            await testBed.render(TestComponent);

            await expect(
                waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining(TEST_PAGE)), {
                    timeout: 100,
                })
            ).rejects.toThrow();
        });
    });
});
