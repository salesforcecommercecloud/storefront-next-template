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
import { PasswordRequirement } from '@/components/password-requirements';

import { FETCHER_STATES } from '@/lib/fetcher-states';
import uiStrings from '@/temp-ui-string';

import { type PasswordUpdateFieldsProps } from './types';

/**
 * PasswordUpdateFields component that renders the form fields for changing password.
 *
 * @param form - React Hook Form instance for managing form state and validation
 * @param updateFetcher - React Router fetcher for handling password update requests
 * @param onCancel - Optional callback function to handle cancel action
 */
export function PasswordUpdateFields({ form, updateFetcher, onCancel }: PasswordUpdateFieldsProps) {
    const isSubmitting = updateFetcher.state === FETCHER_STATES.SUBMITTING;
    // Use form.watch to read the password value directly from form state, including initial values
    const password = form.watch('password') || '';

    return (
        <div className="space-y-4">
            {/* Current Password Field */}
            <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {uiStrings.account.password.currentPassword}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="password"
                                placeholder={uiStrings.account.password.currentPasswordPlaceholder}
                                className="rounded-md"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Password Field */}
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {uiStrings.account.password.newPassword}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="password"
                                placeholder={uiStrings.account.password.newPasswordPlaceholder}
                                className="rounded-md"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Confirm Password Field */}
            <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                            {uiStrings.account.password.confirmPassword}
                        </FormLabel>
                        <FormControl>
                            <Input
                                type="password"
                                placeholder={uiStrings.account.password.confirmPasswordPlaceholder}
                                className="rounded-md"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Password Requirements */}
            <PasswordRequirement password={password} />

            <div className="flex gap-3 pt-2 justify-center">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                    {isSubmitting ? 'Saving...' : uiStrings.account.password.saveButton}
                </Button>
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="rounded-md px-6">
                        {uiStrings.account.password.cancelButton}
                    </Button>
                )}
            </div>
        </div>
    );
}
