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
import { useMemo, type ReactElement, Suspense, useState } from 'react';
import { useOutletContext, Await, useFetcher, useRevalidator } from 'react-router';
import { ToggleCard, ToggleCardSummary, ToggleCardEdit } from '@/components/toggle-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountDetailSkeleton } from '@/components/account-detail-skeleton';
import { PasswordUpdateForm } from '@/components/password-update-form';
import { CustomerProfileForm } from '@/components/customer-profile-form';
import { InterestsPreferencesSection } from '@/components/account/interests-preferences-section';
import { MarketingConsent } from '@/components/account/marketing-consent';
import { useToast } from '@/components/toast';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { useFetcherEffect } from '@/hooks/use-fetcher-effect';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useAuth } from '@/providers/auth';
import CustomerPreferencesProvider from '@/providers/customer-preferences';
import { useTranslation } from 'react-i18next';
import { formatDateForLocale } from '@/lib/date-utils';

type Customer = ShopperCustomers.schemas['Customer'];

type AccountLayoutContext = {
    customer: Promise<Customer | null>;
};

/**
 * Account details content component that renders when customer data is loaded.
 * This component receives the resolved customer data and displays the profile information.
 */
function AccountDetailsContent({ customer }: { customer: Customer | null }): ReactElement {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);

    const { addToast } = useToast();
    const loginFetcher = useFetcher();
    const revalidator = useRevalidator();
    const auth = useAuth();
    const { t, i18n } = useTranslation('account');
    const customerId = auth?.customerId;

    const updateProfileFetcher = useScapiFetcher('shopperCustomers', 'updateCustomer', {
        params: {
            path: {
                customerId: customerId || '',
            },
        },
        body: {},
    });

    const passwordFetcher = useScapiFetcher('shopperCustomers', 'updateCustomerPassword', {
        params: {
            path: {
                customerId: customerId || '',
            },
        },
        body: { currentPassword: '', password: '' },
    });

    // Extract user info from customer data
    const userInfo = useMemo(
        () => ({
            fullName: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
            email: customer?.email || customer?.login || '',
            phoneNumber: customer?.phoneHome || customer?.phoneMobile || '',
        }),
        [customer]
    );

    /**
     * Handles successful login after password update.
     * Called when the user is successfully authenticated with the new password.
     * You can add additional logic here such as:
     * - Refreshing customer data
     * - Analytics tracking
     * - Cache invalidation
     */
    const handleLoginSuccess = () => {
        // Revalidate to refresh customer data
        void revalidator.revalidate();
    };

    /**
     * Handles login error after password update.
     * Called when automatic login fails after password update.
     * You can add additional logic here such as:
     * - Error logging
     * - Analytics tracking
     * - Custom error handling
     */
    const handleLoginError = () => {
        // Show error toast
        addToast('Password updated successfully, but automatic login failed. Please log in again.', 'error');
    };

    /**
     * Handles profile toggle card edit action.
     * Opens the profile form for editing.
     */
    const handleProfileEdit = () => {
        setIsEditingProfile(true);
    };

    /**
     * Handles password toggle card edit action.
     * Opens the password form for editing.
     */
    const handlePasswordEdit = () => {
        setIsEditingPassword(true);
    };

    // Watch loginFetcher for automatic login after password update
    // This fetcher is triggered by handlePasswordSuccess when the user updates their password.
    // We use useFetcherEffect to handle the login response and refresh customer data on success,
    // or show an error message if automatic login fails.
    useFetcherEffect<unknown>(loginFetcher, {
        onSuccess: handleLoginSuccess,
        onError: handleLoginError,
    });

    /**
     * Handles successful profile update.
     * Called when the customer profile form is successfully submitted.
     * You can add additional logic here such as:
     * - Refreshing customer data
     * - Showing success notifications
     * - Analytics tracking
     * - Cache invalidation
     *
     * @param formData - The form data that was successfully submitted
     */
    const handleCustomerProfileSuccess = (_formData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        gender?: string;
        birthday?: string;
    }) => {
        // Show success toast
        addToast(t('profile.successMessage'), 'success');
        // Add your additional logic here

        // Close the editing mode
        setIsEditingProfile(false);
    };

    /**
     * Handles profile update errors.
     * Called when the customer profile form update fails.
     * You can add additional logic here such as:
     * - Error logging
     * - Analytics tracking
     * - Custom error handling
     *
     * @param error - The error that occurred during the update
     */
    const handleCustomerProfileError = (error: string) => {
        // Show error toast
        addToast(error, 'error');
        // Add your additional logic here
        // console.error('Profile update failed:', error);
    };

    /**
     * Handles customer profile cancel action.
     * Resets the form and calls the onCancel callback if provided.
     */
    const handleCustomerProfileCancel = () => {
        setIsEditingProfile(false);
    };

    /**
     * Handles successful password update.
     * Called when the password update form is successfully submitted.
     * Automatically authenticates the user with the new password.
     *
     * @param formData - The form data that was successfully submitted
     */
    const handlePasswordSuccess = (formData: {
        currentPassword: string;
        password: string;
        confirmPassword: string;
    }) => {
        // Show success toast
        addToast(t('password.successMessage'), 'success');
        // Close the editing mode
        setIsEditingPassword(false);

        // Authenticate the user with the new password
        // Get email from customer data (userInfo) and password from formData
        if (userInfo.email && formData.password) {
            // Submit login request with the new password
            void loginFetcher.submit(
                {
                    email: userInfo.email,
                    password: formData.password,
                },
                {
                    method: 'POST',
                    action: '/resource/auth/login-registered',
                    encType: 'application/json',
                }
            );
        } else {
            // console.warn('🔐 Missing email or password for authentication after password update');
            addToast('Password updated successfully, but automatic login failed. Please log in again.', 'error');
        }
    };

    /**
     * Handles password update errors.
     * Called when the password update form update fails.
     * You can add additional logic here such as:
     * - Error logging
     * - Analytics tracking
     * - Custom error handling
     *
     * @param error - The error that occurred during the update
     */
    const handlePasswordError = (error: string) => {
        // Show error toast
        addToast(error, 'error');
        // Add your additional logic here
        // console.error('Password update failed:', error);
    };

    /**
     * Handles password cancel action.
     * Resets the form and calls the onCancel callback if provided.
     */
    const handlePasswordCancel = () => {
        setIsEditingPassword(false);
    };

    /**
     * Handles successful interests & preferences update.
     */
    const handleInterestsPreferencesSuccess = () => {
        addToast(t('interestsPreferences.successMessage'), 'success');
    };

    /**
     * Handles interests & preferences update errors.
     */
    const handleInterestsPreferencesError = (error: string) => {
        addToast(error, 'error');
    };

    return (
        <div className="space-y-6">
            {/* Page Header Card */}
            <Card>
                <CardContent className="py-6">
                    <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                        {t('title')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
                </CardContent>
            </Card>

            {/* Personal Information Toggle Card */}
            <ToggleCard
                id="profile"
                title={t('profile.title')}
                description={t('profile.description')}
                editing={isEditingProfile}
                onEdit={handleProfileEdit}
                editVariant="outline"
                showHeaderSeparator>
                <ToggleCardSummary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('profile.firstName')}</p>
                            <p className="text-sm font-medium text-foreground">
                                {customer?.firstName || t('profile.notProvided')}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('profile.lastName')}</p>
                            <p className="text-sm font-medium text-foreground">
                                {customer?.lastName || t('profile.notProvided')}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('profile.email')}</p>
                            <p className="text-sm font-medium text-foreground">
                                {userInfo.email || t('profile.notProvided')}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('profile.phoneNumber')}</p>
                            <p className="text-sm font-medium text-foreground">
                                {userInfo.phoneNumber || t('profile.notProvided')}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('profile.gender')}</p>
                            <p className="text-sm font-medium text-foreground">
                                {customer?.gender === 1
                                    ? t('profile.genderOptions.male')
                                    : customer?.gender === 2
                                      ? t('profile.genderOptions.female')
                                      : t('profile.notProvided')}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('profile.dateOfBirth')}</p>
                            <p className="text-sm font-medium text-foreground">
                                {formatDateForLocale(customer?.birthday, i18n.language) || t('profile.notProvided')}
                            </p>
                        </div>
                    </div>
                </ToggleCardSummary>

                <ToggleCardEdit>
                    <CustomerProfileForm
                        initialData={{
                            firstName: customer?.firstName || '',
                            lastName: customer?.lastName || '',
                            email: customer?.email || customer?.login || '',
                            phone: customer?.phoneHome || customer?.phoneMobile || '',
                            gender: customer?.gender !== undefined ? String(customer.gender) : '',
                            birthday: customer?.birthday || '',
                        }}
                        updateFetcher={updateProfileFetcher}
                        onSuccess={handleCustomerProfileSuccess}
                        onError={handleCustomerProfileError}
                        onCancel={handleCustomerProfileCancel}
                    />
                </ToggleCardEdit>
            </ToggleCard>

            {/* Interests & Preferences Section */}
            {customerId && (
                <CustomerPreferencesProvider>
                    <InterestsPreferencesSection
                        customerId={customerId}
                        onSuccess={handleInterestsPreferencesSuccess}
                        onError={handleInterestsPreferencesError}
                    />
                </CustomerPreferencesProvider>
            )}

            {/* Password & Security Toggle Card */}
            <ToggleCard
                id="password"
                title={t('password.title')}
                description={t('password.description')}
                editing={isEditingPassword}
                showHeaderSeparator>
                <ToggleCardSummary>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{t('password.password')}</p>
                            <p className="text-sm font-medium text-foreground">{t('password.hiddenPassword')}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handlePasswordEdit}>
                            {t('password.changePassword')}
                        </Button>
                    </div>
                </ToggleCardSummary>

                <ToggleCardEdit>
                    <PasswordUpdateForm
                        updateFetcher={passwordFetcher}
                        onSuccess={handlePasswordSuccess}
                        onError={handlePasswordError}
                        onCancel={handlePasswordCancel}
                    />
                </ToggleCardEdit>
            </ToggleCard>

            {/* Email Preferences – MarketingConsent (part of My Account) */}
            <MarketingConsent />
        </div>
    );
}

/**
 * Account details page component that uses Await to handle customer data loading.
 * Shows a skeleton while the customer data is being loaded.
 */
export default function AccountDetails(): ReactElement {
    // Get customer data from parent layout context
    const { customer: customerPromise } = useOutletContext<AccountLayoutContext>();

    return (
        <Suspense fallback={<AccountDetailSkeleton />}>
            <Await resolve={customerPromise}>
                {(customer: Customer | null) => <AccountDetailsContent customer={customer} />}
            </Await>
        </Suspense>
    );
}
