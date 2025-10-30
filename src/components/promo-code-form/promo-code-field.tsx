import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { FETCHER_STATES } from '@/lib/fetcher-states';
import uiStrings from '@/temp-ui-string';

import { type PromoCodeFieldsProps } from './types';

/**
 * PromoCodeFields component that renders the form fields for entering and applying promo codes.
 *
 * @param form - React Hook Form instance for managing form state and validation
 * @param applyFetcher - React Router fetcher for handling promo code application requests
 */
export function PromoCodeFields({ form, applyFetcher }: PromoCodeFieldsProps) {
    return (
        <div className="space-y-3">
            <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex gap-2">
                            <FormControl>
                                <Input
                                    placeholder={uiStrings.cart.promoCode.placeholder}
                                    className="rounded-md"
                                    {...field}
                                />
                            </FormControl>
                            <Button
                                type="submit"
                                disabled={applyFetcher.state === FETCHER_STATES.SUBMITTING}
                                className="rounded-md bg-secondary cursor-pointer px-4 text-foreground hover:bg-secondary-foreground/40">
                                {applyFetcher.state === FETCHER_STATES.SUBMITTING
                                    ? uiStrings.cart.promoCode.applying
                                    : uiStrings.cart.promoCode.apply}
                            </Button>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
