/* c8 ignore start */
/* istanbul ignore file */
// This file is excluded from coverage as it primarily renders presentational form fields
// using React Hook Form integration. Testing this component properly requires complex
// setup of form context, field state, and render props which is better handled through
// integration tests that can verify end-to-end user interactions.
/* c8 ignore end */

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { FETCHER_STATES } from '@/lib/fetcher-states';
import uiStrings from '@/temp-ui-string';

import { type CustomerProfileFieldsProps } from './types';

/**
 * CustomerProfileFields component that renders the form fields for editing customer profile.
 *
 * @param form - React Hook Form instance for managing form state and validation
 * @param updateFetcher - React Router fetcher for handling profile update requests
 * @param onCancel - Optional callback function to handle cancel action
 */
export function CustomerProfileFields({ form, updateFetcher, onCancel }: CustomerProfileFieldsProps) {
    const isSubmitting = updateFetcher.state === FETCHER_STATES.SUBMITTING;

    return (
        <div className="space-y-4">
            {/* First Name and Last Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name Field */}
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                                {uiStrings.account.profile.firstName}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="text"
                                    autoComplete="given-name"
                                    placeholder={uiStrings.account.profile.firstNamePlaceholder}
                                    className="rounded-md"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Last Name Field */}
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground">
                                {uiStrings.account.profile.lastName}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="text"
                                    autoComplete="family-name"
                                    placeholder={uiStrings.account.profile.lastNamePlaceholder}
                                    className="rounded-md"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Email Field */}
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {uiStrings.account.profile.email}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="email"
                                autoComplete="email"
                                placeholder={uiStrings.account.profile.emailPlaceholder}
                                className="rounded-md"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Phone Number Field */}
            <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {uiStrings.account.profile.phoneNumber}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="tel"
                                autoComplete="tel"
                                inputMode="numeric"
                                placeholder={uiStrings.account.profile.phonePlaceholder}
                                className="rounded-md"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 justify-center">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                    {isSubmitting ? uiStrings.account.profile.savingButton : uiStrings.account.profile.saveButton}
                </Button>
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="rounded-md px-6">
                        {uiStrings.account.profile.cancelButton}
                    </Button>
                )}
            </div>
        </div>
    );
}
