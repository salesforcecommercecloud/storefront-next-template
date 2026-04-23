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
import { useEffect, useMemo, type ReactElement, Suspense, useState } from 'react';
import { useOutletContext, Await, useFetcher, useRevalidator } from 'react-router';
import { ToggleCard, ToggleCardSummary, ToggleCardEdit } from '@/components/toggle-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountDetailSkeleton } from '@/components/account-detail-skeleton';
import { PasswordUpdateForm } from '@/components/password-update-form';
import { CustomerProfileForm } from '@/components/customer-profile-form';
import { InterestsPreferencesSection } from '@/components/account/interests-preferences-section';
import { MarketingConsent } from '@/components/account/marketing-consent';
import { useToast } from '@/components/toast';
import type { ShopperConsents, ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { useFetcherEffect } from '@/hooks/use-fetcher-effect';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { SeoMeta } from '@/components/seo-meta';
import { useAuth } from '@/providers/auth';
import CustomerPreferencesProvider from '@/providers/customer-preferences';
import { useTranslation } from 'react-i18next';
import { formatDateForLocale } from '@/lib/date-utils';
import { FETCHER_STATES } from '@/lib/fetcher-states';
import { buildUrl } from '@salesforce/storefront-next-runtime/site-context';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useCurrentSiteAndLocaleRef } from '@/hooks/use-current-site-and-locale-ref';
import type { AppConfig } from '@/types/config';
import { UITarget } from '@/targets/ui-target';

type Customer = ShopperCustomers.schemas['Customer'];

type AccountLayoutContext = {
    customer: Promise<Customer | null>;
    subscriptions: Promise<ShopperConsents.schemas['ConsentSubscriptionResponse'] | null>;
};

/**
 * Account details content component that renders when customer data is loaded.
 * This component receives the resolved customer data and displays the profile information.
 */
function AccountDetailsContent({
    customer,
    subscriptions,
}: {
    customer: Customer | null;
    subscriptions: ShopperConsents.schemas['ConsentSubscriptionResponse'] | null;
}): ReactElement {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    // Optimistic profile values shown after save until the server customer prop refreshes.
    const [profileOverride, setProfileOverride] = useState<Partial<Customer> | null>(null);

    // Clear the override when server data arrives (e.g. after navigation or revalidation).
    useEffect(() => {
        setProfileOverride(null);
    }, [customer]);

    const { addToast } = useToast();
    const loginFetcher = useFetcher();
    const revalidator = useRevalidator();
    const auth = useAuth();
    const { t, i18n } = useTranslation('account');
    const config = useConfig<AppConfig>();
    const { siteRef, localeRef } = useCurrentSiteAndLocaleRef();
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

    // Merge server customer with optimistic override so saved values display immediately.
    const displayCustomer = useMemo((): Customer | null => {
        if (!customer) return null;
        if (!profileOverride) return customer;
        return { ...customer, ...profileOverride };
    }, [customer, profileOverride]);

    // Extract user info from displayed customer data
    const userInfo = useMemo(
        () => ({
            fullName: `${displayCustomer?.firstName || ''} ${displayCustomer?.lastName || ''}`.trim(),
            email: displayCustomer?.email || displayCustomer?.login || '',
            phoneNumber: displayCustomer?.phoneHome || displayCustomer?.phoneMobile || '',
        }),
        [displayCustomer]
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
     */
    const handleCustomerProfileSuccess = (formData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        gender?: string;
        birthday?: string;
    }) => {
        addToast(t('profile.successMessage'), 'success');
        setIsEditingProfile(false);
        // Show saved values immediately via optimistic override.
        // The override is cleared when the server customer prop refreshes.
        setProfileOverride({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneHome: formData.phone ?? undefined,
            gender: formData.gender ? Number(formData.gender) : undefined,
            birthday: formData.birthday ?? undefined,
        });
    };

    /**
     * Handles profile update errors.
     */
    const handleCustomerProfileError = (error: string) => {
        addToast(error, 'error');
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
            const loginAction = buildUrl({
                to: '/login',
                urlConfig: config.url,
                params: { siteId: siteRef, localeId: localeRef },
            });
            const accountUrl = buildUrl({
                to: '/account',
                urlConfig: config.url,
                params: { siteId: siteRef, localeId: localeRef },
            });
            void loginFetcher.submit(
                {
                    email: userInfo.email,
                    password: formData.password,
                    loginMode: 'password',
                    returnUrl: accountUrl,
                },
                {
                    method: 'POST',
                    action: loginAction,
                }
            );
        } else {
            // console.warn('🔐 Missing email or password for authentication after password update');
            addToast('Password updated successfully, but automatic login failed. Please log in again.', 'error');
        }
    };

    /**
     * Handles password update errors.
     */
    const handlePasswordError = (error: string) => {
        addToast(error, 'error');
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
        <div className="space-y-5">
            {/* Page Header Card */}
            <Card className="bg-card border-border rounded-none shadow-none">
                <CardContent className="px-6 py-3">
                    <h1
                        className="text-[length:var(--account-section-header)] font-semibold text-foreground mb-1"
                        tabIndex={0}>
                        {t('title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
                </CardContent>
            </Card>

            {/* Personal Information – same layout as Interests & Preferences (header actions top right) */}
            <Card data-testid="profile-card" className="bg-card border-border rounded-none shadow-none">
                <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4">
                    <div className="space-y-1.5">
                        <CardTitle className="text-base font-semibold text-foreground">{t('profile.title')}</CardTitle>
                        <CardDescription className="text-muted-foreground">{t('profile.description')}</CardDescription>
                    </div>
                    {isEditingProfile ? (
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                form="customer-profile-form"
                                size="sm"
                                disabled={updateProfileFetcher.state === FETCHER_STATES.SUBMITTING}
                                className="rounded-none">
                                {updateProfileFetcher.state === FETCHER_STATES.SUBMITTING
                                    ? t('common.saving')
                                    : t('common.save')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCustomerProfileCancel}
                                disabled={updateProfileFetcher.state === FETCHER_STATES.SUBMITTING}
                                className="rounded-none bg-card border-border text-foreground hover:bg-muted/50 px-4 py-2 text-sm font-medium">
                                {t('common.cancel')}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleProfileEdit}
                            className="rounded-none bg-card border-border text-foreground hover:bg-muted/50 px-4 py-2 text-sm font-medium">
                            {t('common.edit')}
                        </Button>
                    )}
                </CardHeader>

                <CardContent className="pt-6">
                    {isEditingProfile ? (
                        <CustomerProfileForm
                            formId="customer-profile-form"
                            hideActions
                            initialData={{
                                firstName: displayCustomer?.firstName || '',
                                lastName: displayCustomer?.lastName || '',
                                email: displayCustomer?.email || displayCustomer?.login || '',
                                phone: displayCustomer?.phoneHome || displayCustomer?.phoneMobile || '',
                                gender: displayCustomer?.gender !== undefined ? String(displayCustomer.gender) : '',
                                birthday: displayCustomer?.birthday || '',
                            }}
                            updateFetcher={updateProfileFetcher}
                            onSuccess={handleCustomerProfileSuccess}
                            onError={handleCustomerProfileError}
                            onCancel={handleCustomerProfileCancel}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">{t('profile.firstName')}</p>
                                <p className="text-sm text-foreground" data-testid="profile-value-firstName">
                                    {displayCustomer?.firstName || t('profile.notProvided')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">{t('profile.lastName')}</p>
                                <p className="text-sm text-foreground" data-testid="profile-value-lastName">
                                    {displayCustomer?.lastName || t('profile.notProvided')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">{t('profile.email')}</p>
                                <p className="text-sm text-foreground" data-testid="profile-value-email">
                                    {userInfo.email || t('profile.notProvided')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">{t('profile.phoneNumber')}</p>
                                <p className="text-sm text-foreground" data-testid="profile-value-phone">
                                    {userInfo.phoneNumber || t('profile.notProvided')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">{t('profile.gender')}</p>
                                <p className="text-sm text-foreground" data-testid="profile-value-gender">
                                    {displayCustomer?.gender === 1
                                        ? t('profile.genderOptions.male')
                                        : displayCustomer?.gender === 2
                                          ? t('profile.genderOptions.female')
                                          : t('profile.notProvided')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">{t('profile.dateOfBirth')}</p>
                                <p className="text-sm text-foreground" data-testid="profile-value-birthday">
                                    {formatDateForLocale(displayCustomer?.birthday, i18n.language) ||
                                        t('profile.notProvided')}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <UITarget targetId="sfcc.myAccount.identity.verification" />

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
                showHeaderSeparator
                className="bg-card border-border">
                <ToggleCardSummary>
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">{t('password.password')}</p>
                            <p className="text-sm text-foreground">{t('password.hiddenPassword')}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePasswordEdit}
                            className="rounded-none bg-card border-border text-foreground hover:bg-muted/50 px-4 py-2 text-sm font-medium">
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
            <UITarget targetId="sfcc.myAccount.gdpr.dataRequest" />
            <UITarget targetId="sfcc.myAccount.gdpr.deleteAccount" />

            {/* Email Preferences – MarketingConsent (part of My Account) */}
            <MarketingConsent
                subscriptions={subscriptions}
                contactPointValueByChannel={{
                    email: userInfo.email,
                    sms: userInfo.phoneNumber || undefined,
                }}
                onConsentUpdated={() => void revalidator.revalidate()}
            />
        </div>
    );
}

/**
 * Account details page component that uses Await to handle customer and subscriptions loading.
 * Shows a skeleton while data is being loaded.
 */
export default function AccountDetails(): ReactElement {
    const { customer: customerPromise, subscriptions: subscriptionsPromise } = useOutletContext<AccountLayoutContext>();
    const { t } = useTranslation('account');

    // Stable promise reference so Await does not reset (unmount children) on every re-render.
    const dataPromise = useMemo(
        () => Promise.all([customerPromise, subscriptionsPromise]),
        [customerPromise, subscriptionsPromise]
    );

    return (
        <>
            <SeoMeta title={t('meta.accountDetailsTitle', { defaultValue: 'Account Details' })} noIndex />
            <Suspense fallback={<AccountDetailSkeleton />}>
                <Await resolve={dataPromise}>
                    {([customer, subscriptions]: [
                        Customer | null,
                        ShopperConsents.schemas['ConsentSubscriptionResponse'] | null,
                    ]) => <AccountDetailsContent customer={customer} subscriptions={subscriptions} />}
                </Await>
            </Suspense>
        </>
    );
}
