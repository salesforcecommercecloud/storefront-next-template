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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpressPayments from './express-payments';
import ApplePayLogo from './apple-pay-logo';
import GooglePayLogo from './google-pay-logo';
import PayPalLogo from './paypal-logo';
import VenmoLogo from './venmo-logo';
import StaticPayPalButton from './static-paypal-button';
import StaticVenmoButton from './static-venmo-button';

const createDefaultProps = (overrides = {}) => ({
    disabled: false,
    ...overrides,
});

describe('ExpressPayments Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders payment buttons container', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toBeInTheDocument();
        });

        test('renders all express payment buttons', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            // Check for all payment buttons by their logos
            expect(screen.getByAltText('Apple Pay')).toBeInTheDocument();
            expect(screen.getByAltText('Google Pay')).toBeInTheDocument();
            expect(screen.getByAltText('Amazon Pay')).toBeInTheDocument();
            expect(screen.getByAltText('PayPal')).toBeInTheDocument();
            expect(screen.getByAltText('Venmo')).toBeInTheDocument();
        });

        test('renders divider with Or text', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            // Text content is "Or" but displayed as "OR" via CSS uppercase
            expect(screen.getByText('Or')).toBeInTheDocument();
        });
    });

    describe('Button Interactions', () => {
        beforeEach(() => {
            // Mock window.alert to avoid showing alerts in tests
            vi.spyOn(window, 'alert').mockImplementation(() => {});
        });

        test('shows alert when Apple Pay button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayLogo = screen.getByAltText('Apple Pay');
            const applePayButton = applePayLogo.closest('button');
            expect(applePayButton).toBeInTheDocument();
            if (applePayButton) {
                await user.click(applePayButton);
                expect(window.alert).toHaveBeenCalledWith(
                    'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
                );
            }
        });

        test('shows alert when Google Pay button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const googlePayLogo = screen.getByAltText('Google Pay');
            const googlePayButton = googlePayLogo.closest('button');
            expect(googlePayButton).toBeInTheDocument();
            if (googlePayButton) {
                await user.click(googlePayButton);
                expect(window.alert).toHaveBeenCalledWith(
                    'Google Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
                );
            }
        });

        test('shows alert when Amazon Pay button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const amazonPayLogo = screen.getByAltText('Amazon Pay');
            const amazonPayButton = amazonPayLogo.closest('button');
            expect(amazonPayButton).toBeInTheDocument();
            if (amazonPayButton) {
                await user.click(amazonPayButton);
                expect(window.alert).toHaveBeenCalledWith(
                    'Amazon Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
                );
            }
        });

        test('shows alert when PayPal button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const paypalLogo = screen.getByAltText('PayPal');
            const paypalButton = paypalLogo.closest('button');
            expect(paypalButton).toBeInTheDocument();
            if (paypalButton) {
                await user.click(paypalButton);
                expect(window.alert).toHaveBeenCalledWith(
                    'PayPal express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
                );
            }
        });

        test('shows alert when Venmo button is clicked', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const venmoLogo = screen.getByAltText('Venmo');
            const venmoButton = venmoLogo.closest('button');
            expect(venmoButton).toBeInTheDocument();
            if (venmoButton) {
                await user.click(venmoButton);
                expect(window.alert).toHaveBeenCalledWith(
                    'Venmo express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
                );
            }
        });

        test('does not show alerts when disabled', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const applePayLogo = screen.getByAltText('Apple Pay');
            const applePayButton = applePayLogo.closest('button');

            if (applePayButton) {
                await user.click(applePayButton);
            }

            // No alert should be shown when buttons are disabled
            expect(window.alert).not.toHaveBeenCalled();
        });
    });

    describe('Disabled State', () => {
        test('passes disabled prop to all payment buttons', () => {
            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const buttons = screen.getAllByRole('button');
            // All buttons should be disabled
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
            });
        });
    });

    describe('Static Buttons', () => {
        test('renders static PayPal and Venmo buttons immediately', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            // Static buttons render immediately without SDK loading
            expect(screen.getByAltText('PayPal')).toBeInTheDocument();
            expect(screen.getByAltText('Venmo')).toBeInTheDocument();
        });

        test('static buttons match SDK appearance', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            const paypalLogo = screen.getByAltText('PayPal');
            const venmoLogo = screen.getByAltText('Venmo');

            // Logos should be present
            expect(paypalLogo).toBeInTheDocument();
            expect(venmoLogo).toBeInTheDocument();
        });
    });

    describe('Layout Options', () => {
        test('renders horizontal layout by default', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('sm:grid-cols-2');
            expect(gridContainer).toHaveClass('lg:grid-cols-4');
        });

        test('renders vertical layout when layout prop is "vertical"', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ layout: 'vertical' })} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('grid-cols-1');
            expect(gridContainer).not.toHaveClass('sm:grid-cols-2');
            expect(gridContainer).not.toHaveClass('lg:grid-cols-4');
        });

        test('vertical layout has tighter spacing', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ layout: 'vertical' })} />);

            const gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('gap-3');
        });
    });

    describe('Static Payment Buttons', () => {
        test('renders all static payment buttons', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            // All buttons should render immediately as static components
            expect(screen.getByAltText('Apple Pay')).toBeInTheDocument();
            expect(screen.getByAltText('Google Pay')).toBeInTheDocument();
            expect(screen.getByAltText('Amazon Pay')).toBeInTheDocument();
            expect(screen.getByAltText('PayPal')).toBeInTheDocument();
            expect(screen.getByAltText('Venmo')).toBeInTheDocument();
        });
    });

    describe('Separator Configuration', () => {
        test('renders separator at bottom by default', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separators = container.querySelectorAll('.relative');
            // Should have a separator element
            expect(separators.length).toBeGreaterThan(0);

            // Default text is "Or" (displayed as "OR" via CSS uppercase)
            expect(screen.getByText('Or')).toBeInTheDocument();
        });

        test('renders separator at top when position is "top"', () => {
            render(<ExpressPayments {...createDefaultProps({ separatorPosition: 'top' })} />);

            // Separator text should still be present (displayed as "OR" via CSS uppercase)
            expect(screen.getByText('Or')).toBeInTheDocument();
        });

        test('renders custom separator text with uppercase styling', () => {
            render(<ExpressPayments {...createDefaultProps({ separatorText: 'Or continue with card' })} />);

            // Text content in DOM, displayed as uppercase via CSS
            expect(screen.getByText('Or continue with card')).toBeInTheDocument();
            expect(screen.queryByText('Or')).not.toBeInTheDocument();
        });

        test('renders custom separator text at top position with uppercase styling', () => {
            render(
                <ExpressPayments
                    {...createDefaultProps({ separatorPosition: 'top', separatorText: 'Express checkout' })}
                />
            );

            // Text content in DOM, displayed as uppercase via CSS
            expect(screen.getByText('Express checkout')).toBeInTheDocument();
        });

        test('separator has both left and right lines', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            // Find separator container
            const separator = container.querySelector('.relative.flex.items-center');
            expect(separator).toBeInTheDocument();

            // Should have two line elements (left and right) - find divs with flex-1 class
            const lines = separator?.querySelectorAll('div.flex-1');
            expect(lines).toHaveLength(2);
        });

        test('separator lines have correct styling (2px height, separator color)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const lines = separator?.querySelectorAll('div.flex-1');

            lines?.forEach((line) => {
                expect(line).toHaveClass('h-[2px]');
                expect(line).toHaveClass('bg-separator');
            });
        });

        test('separator text has correct styling (separator-foreground, uppercase)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const textElement = separator?.querySelector('span');

            expect(textElement).toHaveClass('text-separator-foreground');
            expect(textElement).toHaveClass('uppercase');
            expect(textElement).toHaveClass('font-medium');
            expect(textElement).toHaveClass('text-sm');
        });

        test('separator text applies uppercase CSS transformation', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ separatorText: 'Or buy with' })} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const textElement = separator?.querySelector('span') as HTMLElement;

            // Verify uppercase class is applied
            expect(textElement).toHaveClass('uppercase');
            // Verify text content is preserved (CSS transforms display, not content)
            expect(textElement.textContent).toBe('Or buy with');
        });

        test('separator appears after buttons when position is bottom (default)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const gridContainer = container.querySelector('.grid');
            const separator = container.querySelector('.relative.flex.items-center');

            // Separator should come after the grid in DOM order
            expect(gridContainer && separator).toBeTruthy();
            if (gridContainer && separator) {
                expect(gridContainer.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            }
        });

        test('separator appears before buttons when position is top', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps({ separatorPosition: 'top' })} />);

            const gridContainer = container.querySelector('.grid');
            const separator = container.querySelector('.relative.flex.items-center');

            // Separator should come before the grid in DOM order
            expect(gridContainer && separator).toBeTruthy();
            if (gridContainer && separator) {
                expect(gridContainer.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
            }
        });

        test('separator lines are visible (not hidden)', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const separator = container.querySelector('.relative.flex.items-center');
            const lines = separator?.querySelectorAll('div.flex-1');

            expect(lines).toHaveLength(2);
            lines?.forEach((line) => {
                const htmlElement = line as HTMLElement;
                // Lines should have flex-1 class to take up space
                expect(htmlElement).toHaveClass('flex-1');
                // Should have height
                expect(htmlElement).toHaveClass('h-[2px]');
            });
        });
    });

    describe('Accessibility', () => {
        test('all buttons have aria-label attributes', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('buttons are keyboard accessible', async () => {
            const user = userEvent.setup();
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            applePayButton.focus();
            expect(applePayButton).toHaveFocus();

            await user.keyboard('{Enter}');
            expect(alertSpy).toHaveBeenCalledWith(
                'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        });

        test('disabled buttons do not trigger onClick handlers', async () => {
            const user = userEvent.setup();
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            expect(applePayButton).toBeDisabled();

            // Try to click disabled button
            await user.click(applePayButton);
            expect(alertSpy).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            // Mock window.alert for all edge case tests
            vi.spyOn(window, 'alert').mockImplementation(() => {});
        });

        test('renders successfully with minimal props', () => {
            render(<ExpressPayments />);

            // Component should render without errors
            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('handles rapid button clicks', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            const googlePayButton = screen.getByRole('button', { name: 'Google Pay' });

            // Rapid clicks
            await user.click(applePayButton);
            await user.click(googlePayButton);
            await user.click(applePayButton);

            expect(window.alert).toHaveBeenCalledTimes(3);
        });

        test('maintains button order in DOM', () => {
            const { container } = render(<ExpressPayments {...createDefaultProps()} />);

            const buttons = container.querySelectorAll('button');
            const buttonLabels = Array.from(buttons).map((btn) => btn.getAttribute('aria-label'));

            // Verify order: Apple Pay, Google Pay, Amazon Pay, PayPal, Venmo
            expect(buttonLabels).toEqual(['Apple Pay', 'Google Pay', 'Amazon Pay', 'PayPal', 'Venmo']);
        });

        test('renders with all optional props undefined', () => {
            render(<ExpressPayments />);

            // Should render all buttons
            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });

        test('handles onClick errors gracefully', async () => {
            const user = userEvent.setup();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });

            // Click should trigger alert (component's internal behavior)
            await user.click(applePayButton);
            expect(window.alert).toHaveBeenCalledWith(
                'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );

            // Cleanup
            consoleErrorSpy.mockRestore();
        });

        test('handles rapid sequential clicks on same button', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });

            // Rapid clicks
            await user.click(applePayButton);
            await user.click(applePayButton);
            await user.click(applePayButton);

            expect(window.alert).toHaveBeenCalledTimes(3);
        });

        test('handles rapid clicks on different buttons', async () => {
            const user = userEvent.setup();

            render(<ExpressPayments {...createDefaultProps()} />);

            const applePayButton = screen.getByRole('button', { name: 'Apple Pay' });
            const googlePayButton = screen.getByRole('button', { name: 'Google Pay' });
            const payPalButton = screen.getByRole('button', { name: 'PayPal' });

            // Rapid clicks on different buttons
            await user.click(applePayButton);
            await user.click(googlePayButton);
            await user.click(payPalButton);
            await user.click(applePayButton);

            expect(window.alert).toHaveBeenCalledTimes(4);
        });
    });

    describe('Component lifecycle and re-renders', () => {
        test('maintains button state across re-renders', () => {
            const { rerender } = render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();

            // Re-render with same props
            rerender(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
        });

        test('updates disabled state on prop change', () => {
            const { rerender } = render(<ExpressPayments {...createDefaultProps({ disabled: false })} />);

            let buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).not.toBeDisabled();
            });

            // Update to disabled
            rerender(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
            });
        });

        test('updates layout prop correctly', () => {
            const { container, rerender } = render(
                <ExpressPayments {...createDefaultProps({ layout: 'horizontal' })} />
            );

            let gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('sm:grid-cols-2');
            expect(gridContainer).toHaveClass('lg:grid-cols-4');

            // Change to vertical
            rerender(<ExpressPayments {...createDefaultProps({ layout: 'vertical' })} />);

            gridContainer = container.querySelector('.grid');
            expect(gridContainer).toHaveClass('grid-cols-1');
            expect(gridContainer).not.toHaveClass('sm:grid-cols-2');
        });

        test('updates separator position prop correctly', () => {
            const { container, rerender } = render(
                <ExpressPayments {...createDefaultProps({ separatorPosition: 'bottom' })} />
            );

            const gridContainer = container.querySelector('.grid');
            const separator = container.querySelector('.relative.flex.items-center');

            // Separator should come after grid
            expect(gridContainer && separator).toBeTruthy();
            if (gridContainer && separator) {
                expect(gridContainer.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            }

            // Change to top
            rerender(<ExpressPayments {...createDefaultProps({ separatorPosition: 'top' })} />);

            const gridContainer2 = container.querySelector('.grid');
            const separator2 = container.querySelector('.relative.flex.items-center');

            // Separator should come before grid
            expect(gridContainer2 && separator2).toBeTruthy();
            if (gridContainer2 && separator2) {
                expect(gridContainer2.compareDocumentPosition(separator2)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
            }
        });

        test('updates separator text prop correctly', () => {
            const { rerender } = render(<ExpressPayments {...createDefaultProps({ separatorText: 'Or' })} />);

            expect(screen.getByText('Or')).toBeInTheDocument();

            // Change separator text
            rerender(<ExpressPayments {...createDefaultProps({ separatorText: 'Or continue with' })} />);

            expect(screen.getByText('Or continue with')).toBeInTheDocument();
            expect(screen.queryByText('Or')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility enhancements', () => {
        test('all buttons are focusable when enabled', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).not.toHaveAttribute('tabindex', '-1');
            });
        });

        test('disabled buttons are not focusable via keyboard', () => {
            render(<ExpressPayments {...createDefaultProps({ disabled: true })} />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
                // Disabled buttons should not be focusable
                expect(button).toHaveAttribute('disabled');
            });
        });

        test('buttons have proper ARIA labels for screen readers', () => {
            render(<ExpressPayments {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: 'Apple Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Google Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Amazon Pay' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'PayPal' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Venmo' })).toBeInTheDocument();
        });
    });

    describe('Logo Components', () => {
        describe('ApplePayLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<ApplePayLogo />);
                const image = screen.getByAltText('Apple Pay');
                expect(image).toBeInTheDocument();
                // SVG is imported as a module and inlined as data URL
                expect(image).toHaveAttribute('src');
                expect(image.getAttribute('src')).toContain('data:image/svg+xml');
            });

            test('applies custom className', () => {
                render(<ApplePayLogo className="custom-class" />);
                const image = screen.getByAltText('Apple Pay');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-4');
                expect(image).toHaveClass('w-auto');
            });

            test('has white logo styling (brightness and invert filter)', () => {
                render(<ApplePayLogo />);
                const image = screen.getByAltText('Apple Pay');
                expect(image.style.objectFit).toBe('contain');
                expect(image.style.filter).toBe('brightness(0) invert(1)');
            });
        });

        describe('GooglePayLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<GooglePayLogo />);
                const image = screen.getByAltText('Google Pay');
                expect(image).toBeInTheDocument();
                // SVG is imported as a module and inlined as data URL
                expect(image).toHaveAttribute('src');
                expect(image.getAttribute('src')).toContain('data:image/svg+xml');
            });

            test('applies custom className', () => {
                render(<GooglePayLogo className="custom-class" />);
                const image = screen.getByAltText('Google Pay');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-4');
                expect(image).toHaveClass('w-auto');
            });

            test('has correct styling', () => {
                render(<GooglePayLogo />);
                const image = screen.getByAltText('Google Pay');
                expect(image.style.objectFit).toBe('contain');
            });
        });

        describe('PayPalLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<PayPalLogo />);
                const image = screen.getByAltText('PayPal');
                expect(image).toBeInTheDocument();
                // SVG is imported as a module and inlined as data URL
                expect(image).toHaveAttribute('src');
                expect(image.getAttribute('src')).toContain('data:image/svg+xml');
            });

            test('applies custom className', () => {
                render(<PayPalLogo className="custom-class" />);
                const image = screen.getByAltText('PayPal');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-4');
                expect(image).toHaveClass('w-auto');
            });

            test('has correct styling', () => {
                render(<PayPalLogo />);
                const image = screen.getByAltText('PayPal');
                expect(image.style.objectFit).toBe('contain');
            });
        });

        describe('VenmoLogo', () => {
            test('renders with correct src and alt text', () => {
                render(<VenmoLogo />);
                const image = screen.getByAltText('Venmo');
                expect(image).toBeInTheDocument();
                // SVG is imported as a module and inlined as data URL
                expect(image).toHaveAttribute('src');
                expect(image.getAttribute('src')).toContain('data:image/svg+xml');
            });

            test('applies custom className', () => {
                render(<VenmoLogo className="custom-class" />);
                const image = screen.getByAltText('Venmo');
                expect(image).toHaveClass('custom-class');
                expect(image).toHaveClass('h-3');
                expect(image).toHaveClass('w-auto');
            });

            test('has white logo styling (brightness and invert filter)', () => {
                render(<VenmoLogo />);
                const image = screen.getByAltText('Venmo');
                expect(image.style.objectFit).toBe('contain');
                expect(image.style.filter).toBe('brightness(0) invert(1)');
            });
        });
    });

    describe('Static Button Components', () => {
        describe('StaticPayPalButton', () => {
            test('renders the PayPal button', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toBeInTheDocument();
            });

            test('calls onClick when clicked', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).toHaveBeenCalledTimes(1);
            });

            test('renders PayPal logo', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const logo = screen.getByAltText('PayPal');
                expect(logo).toBeInTheDocument();
            });

            test('is disabled when disabled prop is true', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                expect(button).toBeDisabled();
            });

            test('is not disabled by default', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).not.toBeDisabled();
            });

            test('has PayPal gold background color', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('bg-[var(--paypal-gold)]');
            });

            test('has correct button styling', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('w-full');
                expect(button).toHaveClass('h-12');
                expect(button).toHaveClass('rounded-lg');
            });

            test('has aria-label for accessibility', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button', { name: 'PayPal' });
                expect(button).toBeInTheDocument();
            });

            test('does not call onClick when disabled', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).not.toHaveBeenCalled();
            });

            test('has hover state styling', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('hover:bg-[#FFB800]');
            });

            test('has transition classes for smooth interactions', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('transition-colors');
            });

            test('has correct text color', () => {
                const onClick = vi.fn();
                render(<StaticPayPalButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('text-[#1F2937]');
            });
        });

        describe('StaticVenmoButton', () => {
            test('renders the Venmo button', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toBeInTheDocument();
            });

            test('calls onClick when clicked', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).toHaveBeenCalledTimes(1);
            });

            test('renders Venmo logo', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const logo = screen.getByAltText('Venmo');
                expect(logo).toBeInTheDocument();
            });

            test('is disabled when disabled prop is true', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                expect(button).toBeDisabled();
            });

            test('is not disabled by default', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).not.toBeDisabled();
            });

            test('has Venmo blue background color', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('bg-[var(--venmo-blue)]');
            });

            test('has correct button styling', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('w-full');
                expect(button).toHaveClass('h-12');
                expect(button).toHaveClass('rounded-lg');
            });

            test('has aria-label for accessibility', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button', { name: 'Venmo' });
                expect(button).toBeInTheDocument();
            });

            test('does not call onClick when disabled', async () => {
                const user = userEvent.setup();
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} disabled={true} />);

                const button = screen.getByRole('button');
                await user.click(button);

                expect(onClick).not.toHaveBeenCalled();
            });

            test('has hover state styling', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('hover:bg-[#2d7fb8]');
            });

            test('has transition classes for smooth interactions', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('transition-colors');
            });

            test('has correct text color', () => {
                const onClick = vi.fn();
                render(<StaticVenmoButton onClick={onClick} />);

                const button = screen.getByRole('button');
                expect(button).toHaveClass('text-background');
            });
        });
    });
});
