import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form } from '@/components/ui/form';
import { PromoCodeFields } from './promo-code-field';

//hooks
import { useToast } from '@/components/toast';
import { usePromoCodeActions } from '@/hooks/use-promo-code-actions';

//types
import { promoCodeFormSchema } from './index';
import { type PromoCodeFormData, type PromoCodeFormProps } from './types';

import uiStrings from '@/temp-ui-string';

/**
 * PromoCodeForm component that provides an accordion-based interface for applying promo codes to a shopping basket.
 *
 * This component renders as a collapsible accordion containing a form for entering and submitting promo codes.
 * It handles form validation, submission, and displays appropriate success/error feedback through toasts.
 * The form automatically resets and closes the accordion on successful submission.
 *
 * @param basketId - Optional basket ID to associate the promo code with. If not provided, form submission will
 *                   show an error.
 *
 * @returns JSX element containing the promo code form wrapped in an accordion
 *
 * @example
 * ```tsx
 * // Basic usage with basket ID
 * <PromoCodeForm basketId="basket-123" />
 *
 * // Usage without basket ID (will show error on submit)
 * <PromoCodeForm />
 * ```
 *
 */
export const PromoCodeForm = ({ basketId }: PromoCodeFormProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { applyPromoCode, applyFetcher } = usePromoCodeActions(basketId);

    const form = useForm<PromoCodeFormData>({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: {
            code: '',
        },
    });

    const { addToast } = useToast();

    /**
     * Handles the response from the promo code application API call.
     *
     * This effect monitors the applyFetcher.data for changes and processes the response:
     * - On success: resets the form, closes the accordion, and shows success toast
     * - On error: sets form error state and shows error toast
     *
     * @dependencies applyFetcher.data, form
     */
    useEffect(() => {
        if (applyFetcher.data) {
            if (applyFetcher.data.success) {
                form.reset({ code: '' });
                setIsOpen(false);
                addToast(uiStrings.cart.promoCode.successMessage, 'success');
            } else {
                // Get the error message from the API response
                const errorMessage = applyFetcher.data.error || uiStrings.cart.promoCode.errorMessage;

                // Set the form error with the specific API error message
                form.setError('code', {
                    type: 'manual',
                    message: errorMessage,
                });

                // Show error toast
                addToast(errorMessage, 'error');
            }
        }
        // addToast is stable and does not need to be in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyFetcher.data, form]);

    /**
     * Handles form submission for applying a promo code.
     *
     * This function is called when the form is submitted and performs the following:
     * 1. Validates that a basket ID is available
     * 2. If no basket ID, sets a form error and returns early
     * 3. If basket ID exists, calls the applyPromoCode function with the entered code
     *
     * @param data - The validated form data containing the promo code
     * @param data.code - The promo code string entered by the user
     */
    const handleSubmit = form.handleSubmit((data) => {
        if (!basketId) {
            form.setError('code', {
                type: 'manual',
                message: uiStrings.cart.promoCode.noBasketMessage,
            });
            return;
        }

        applyPromoCode(data.code);
    });

    return (
        <div className="w-full">
            <Accordion
                type="single"
                collapsible
                value={isOpen ? 'promo-code' : ''}
                onValueChange={(value) => setIsOpen(value === 'promo-code')}>
                <AccordionItem value="promo-code">
                    <AccordionTrigger onClick={() => form.reset()}>
                        <span className="flex-1 text-left text-sm font-medium text-primary">
                            {uiStrings.cart.promoCode.accordionTitle}
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 py-0">
                        <div className="bg-background p-2">
                            <Form {...form}>
                                <form onSubmit={(e) => void handleSubmit(e)} data-testid="promo-code-form">
                                    <PromoCodeFields form={form} applyFetcher={applyFetcher} />
                                </form>
                            </Form>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};
