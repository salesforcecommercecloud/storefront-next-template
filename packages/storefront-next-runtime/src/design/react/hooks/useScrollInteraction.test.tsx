import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { createComponentTestBed } from '../../test/component-test-bed';
import { fireEvent, waitFor } from '@testing-library/react';

const TestComponent = ({ children }: React.PropsWithChildren) => <>{children}</>;

describe('scroll interaction', () => {
    const testBed = createComponentTestBed(() => ({}));

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('when the window scroll change comes from the host', () => {
        beforeEach(() => {
            vi.spyOn(window, 'scrollTo');
            testBed.afterRender(({ host }) => {
                host.notifyWindowScrollChanged({ scrollY: 100 });
            });
        });

        it('should scroll the window to the new scroll position', async () => {
            await testBed.render(TestComponent);

            // Events are dispatched asynchronously, so we need to wait for the scroll to be applied.
            await waitFor(
                () =>
                    expect(window.scrollTo).toHaveBeenCalledWith({
                        behavior: 'instant',
                        top: 100,
                    }),
                { timeout: 1_000 }
            );
        });
    });

    describe('when the window scrolls in the client', () => {
        let spy: Mock;

        beforeEach(() => {
            spy = vi.fn();
            testBed.defineProperty(window, 'scrollX', { value: 100 });
            testBed.defineProperty(window, 'scrollY', { value: 200 });
            testBed.afterHostCreated((host) => {
                host.on('WindowScrollChanged', spy);
            });
            testBed.afterRender(() => {
                fireEvent.scroll(window);
            });
        });

        it('should scroll the window to the new scroll position', async () => {
            await testBed.render(TestComponent);

            // Events are dispatched asynchronously, so we need to wait for the scroll to be applied.
            await waitFor(
                () => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ scrollX: 100, scrollY: 200 })),
                { timeout: 1_000 }
            );
        });
    });
});
