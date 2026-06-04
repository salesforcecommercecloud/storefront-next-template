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
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// eslint-disable-next-line import/no-namespace -- vi.spyOn requires namespace import
import * as ReactRouter from 'react-router';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { resourceRoutes } from '@/route-paths';
import OtpModal from './otp-modal';

const mockSubmit = vi.fn();

function renderModal(props: Partial<React.ComponentProps<typeof OtpModal>> = {}) {
    const router = createMemoryRouter(
        [
            {
                path: '*',
                element: (
                    <AllProvidersWrapper>
                        <OtpModal
                            isOpen={true}
                            email="test@example.com"
                            onClose={vi.fn()}
                            onSuccess={vi.fn()}
                            otpLength={6}
                            {...props}
                        />
                    </AllProvidersWrapper>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, digits: string) {
    const inputs = screen.getAllByRole('textbox');
    for (let i = 0; i < digits.length; i++) {
        await user.type(inputs[i], digits[i]);
    }
}

describe('OtpModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(ReactRouter, 'useFetcher').mockReturnValue({
            submit: mockSubmit,
            state: 'idle',
            data: undefined,
        } as any);
    });

    describe('visibility', () => {
        it('renders dialog when isOpen is true', () => {
            renderModal();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('does not render dialog when isOpen is false', () => {
            renderModal({ isOpen: false });
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('slot count', () => {
        it('renders otpLength slots initially', () => {
            renderModal({ otpLength: 6 });
            expect(screen.getAllByRole('textbox')).toHaveLength(6);
        });

        it('renders otpLength slots initially when configured for 8', () => {
            renderModal({ otpLength: 8 });
            expect(screen.getAllByRole('textbox')).toHaveLength(8);
        });
    });

    describe('submission', () => {
        it('submits the entered code via the Verify button', async () => {
            const user = userEvent.setup();
            renderModal();

            await typeCode(user, '111111');
            await user.click(screen.getByRole('button', { name: 'Verify' }));

            expect(mockSubmit).toHaveBeenCalled();
            const [formData] = mockSubmit.mock.calls[0] as [FormData];
            expect(formData.get('email')).toBe('test@example.com');
            expect(formData.get('otpCode')).toBe('111111');
        });

        it('does not submit until Verify is clicked (no auto-submit at full length)', async () => {
            const user = userEvent.setup();
            renderModal();

            await typeCode(user, '111111');

            expect(mockSubmit).not.toHaveBeenCalled();
        });
    });

    describe('verifyActionUrl', () => {
        it('submits to /action/verify-passwordless-otp by default', async () => {
            const user = userEvent.setup();
            renderModal();

            await typeCode(user, '111111');
            await user.click(screen.getByRole('button', { name: 'Verify' }));

            expect(mockSubmit).toHaveBeenCalledWith(
                expect.any(FormData),
                expect.objectContaining({ method: 'POST', action: resourceRoutes.verifyPasswordlessOtp })
            );
        });

        it('submits to custom verifyActionUrl when provided', async () => {
            const user = userEvent.setup();
            renderModal({ verifyActionUrl: '/action/verify-signup-otp' });

            await typeCode(user, '111111');
            await user.click(screen.getByRole('button', { name: 'Verify' }));

            expect(mockSubmit).toHaveBeenCalledWith(
                expect.any(FormData),
                expect.objectContaining({ method: 'POST', action: '/action/verify-signup-otp' })
            );
        });
    });

    describe('Verify button enablement', () => {
        it('enables Verify only once the minimum code length is reached', async () => {
            const user = userEvent.setup();
            renderModal({ otpLength: 6 });

            const verifyButton = screen.getByRole('button', { name: 'Verify' });
            expect(verifyButton).toBeDisabled();

            await typeCode(user, '11111');
            expect(verifyButton).toBeDisabled();

            const inputs = screen.getAllByRole('textbox');
            await user.type(inputs[5], '1');
            expect(verifyButton).toBeEnabled();
        });
    });

    // SLAS owns the delivered length and can drift from the configured `otpLength`.
    // Pasting a longer code expands the inputs to fit it, and a paste auto-submits
    // (it arrives whole, so it can't be a prefix of a longer code the way typing can).
    describe('paste expands and auto-submits', () => {
        it('grows from 6 slots to 8 and auto-submits the pasted 8-digit code', async () => {
            const user = userEvent.setup();
            renderModal({ otpLength: 6 });

            expect(screen.getAllByRole('textbox')).toHaveLength(6);

            screen.getAllByRole('textbox')[0].focus();
            await user.paste('12345678');

            expect(screen.getAllByRole('textbox')).toHaveLength(8);
            // Auto-submitted on paste — no Verify click needed.
            expect(mockSubmit).toHaveBeenCalledTimes(1);
            const [formData] = mockSubmit.mock.calls[0] as [FormData];
            expect(formData.get('otpCode')).toBe('12345678');
        });

        it('auto-submits a pasted 6-digit code at the matched length', async () => {
            const user = userEvent.setup();
            renderModal({ otpLength: 6 });

            screen.getAllByRole('textbox')[0].focus();
            await user.paste('123456');

            expect(mockSubmit).toHaveBeenCalledTimes(1);
            const [formData] = mockSubmit.mock.calls[0] as [FormData];
            expect(formData.get('otpCode')).toBe('123456');
        });

        it('does not auto-submit a pasted code shorter than the minimum', async () => {
            const user = userEvent.setup();
            renderModal({ otpLength: 6 });

            screen.getAllByRole('textbox')[0].focus();
            await user.paste('1234');

            expect(mockSubmit).not.toHaveBeenCalled();
        });
    });

    // Typing never auto-submits — a typed code could be a prefix of a longer one,
    // so the shopper confirms with Verify.
    describe('typed codes require the Verify button', () => {
        it('does not auto-submit when the code is typed digit by digit', async () => {
            const user = userEvent.setup();
            renderModal({ otpLength: 6 });

            await typeCode(user, '111111');

            expect(mockSubmit).not.toHaveBeenCalled();
        });
    });

    // The external onVerifyCode path (Change Email) verifies without the fetcher,
    // which never sets the verifying state, so the button must still disable on
    // click to stop a second submission while the parent is verifying.
    describe('verifying state on the onVerifyCode path', () => {
        it('disables Verify after the first click', async () => {
            const user = userEvent.setup();
            const onVerifyCode = vi.fn();
            renderModal({ otpLength: 6, onVerifyCode });

            await typeCode(user, '111111');

            const verifyButton = screen.getByRole('button', { name: 'Verify' });
            await user.click(verifyButton);

            expect(onVerifyCode).toHaveBeenCalledTimes(1);
            expect(verifyButton).toBeDisabled();
        });
    });

    // A gap (an empty slot before a filled one) collapses under join(''), so the
    // submitted code would not match the boxes — Verify must stay disabled.
    describe('gapped entry', () => {
        it('keeps Verify disabled when a middle slot is empty', async () => {
            const user = userEvent.setup();
            renderModal({ otpLength: 6 });

            await typeCode(user, '111111');

            const verifyButton = screen.getByRole('button', { name: 'Verify' });
            expect(verifyButton).toBeEnabled();

            const inputs = screen.getAllByRole('textbox');
            await user.clear(inputs[2]);
            expect(verifyButton).toBeDisabled();
        });
    });
});
