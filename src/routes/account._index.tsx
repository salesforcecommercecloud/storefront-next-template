import { useMemo, type ReactElement, Suspense, useState } from 'react';
import { useOutletContext, Await, useFetcher, useRevalidator } from 'react-router';
import { ToggleCard, ToggleCardSummary, ToggleCardEdit } from '@/components/toggle-card';
import { AccountDetailSkeleton } from '@/components/account-detail-skeleton';
import { PasswordUpdateForm } from '@/components/password-update-form';
import { CustomerProfileForm } from '@/components/customer-profile-form';
import { useToast } from '@/components/toast';
import uiStrings from '@/temp-ui-string';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';
import { useFetcherEffect } from '@/hooks/use-fetcher-effect';
import { useScapiFetcher, type ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useAuth } from '@/providers/auth';
import type { CustomerProfileFetcherData } from '@/components/customer-profile-form/types';
import type { PasswordUpdateFetcherData } from '@/components/password-update-form/types';

type AccountLayoutContext = {
    customer: Promise<ShopperCustomersTypes.Customer | null>;
};

/**
 * Account details content component that renders when customer data is loaded.
 * This component receives the resolved customer data and displays the profile information.
 */
function AccountDetailsContent({ customer }: { customer: ShopperCustomersTypes.Customer | null }): ReactElement {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);

    const { addToast } = useToast();
    const loginFetcher = useFetcher();
    const revalidator = useRevalidator();
    const auth = useAuth();
    const customerId = auth?.customer_id;

    // Create fetchers for profile and password updates
    const updateProfileFetcher = useScapiFetcher('ShopperCustomers', 'updateCustomer', {
        parameters: { customerId: customerId || '' },
        body: {},
    });

    const passwordFetcher = useScapiFetcher('ShopperCustomers', 'updateCustomerPassword', {
        parameters: { customerId: customerId || '' },
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
    }) => {
        // Show success toast
        addToast(uiStrings.account.profile.successMessage, 'success');
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
        addToast(uiStrings.account.password.successMessage, 'success');
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

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                    {uiStrings.account.title}
                </h1>
            </div>

            {/* My Profile Toggle Card */}
            <ToggleCard
                id="profile"
                title={uiStrings.account.profile.title}
                editing={isEditingProfile}
                onEdit={handleProfileEdit}>
                <ToggleCardSummary>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                            <div className="mb-2">
                                <p className="text-sm font-bold text-foreground">
                                    {uiStrings.account.profile.fullName}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-foreground">{userInfo.fullName}</p>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2">
                                <p className="text-sm font-bold text-foreground">{uiStrings.account.profile.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-foreground">{userInfo.email}</p>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2">
                                <p className="text-sm font-bold text-foreground">
                                    {uiStrings.account.profile.phoneNumber}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-foreground">
                                    {userInfo.phoneNumber === 'N/A'
                                        ? uiStrings.account.profile.notProvided
                                        : userInfo.phoneNumber}
                                </p>
                            </div>
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
                        }}
                        updateFetcher={updateProfileFetcher as ScapiFetcher<CustomerProfileFetcherData>}
                        onSuccess={handleCustomerProfileSuccess}
                        onError={handleCustomerProfileError}
                        onCancel={handleCustomerProfileCancel}
                    />
                </ToggleCardEdit>
            </ToggleCard>

            {/* Password Toggle Card */}
            <ToggleCard
                id="password"
                title={uiStrings.account.password.title}
                editing={isEditingPassword}
                onEdit={handlePasswordEdit}>
                <ToggleCardSummary>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                            <div className="mb-2">
                                <p className="text-sm font-bold text-foreground">
                                    {uiStrings.account.password.password}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-foreground">••••••••</p>
                            </div>
                        </div>
                    </div>
                </ToggleCardSummary>

                <ToggleCardEdit>
                    <PasswordUpdateForm
                        updateFetcher={passwordFetcher as ScapiFetcher<PasswordUpdateFetcherData>}
                        onSuccess={handlePasswordSuccess}
                        onError={handlePasswordError}
                        onCancel={handlePasswordCancel}
                    />
                </ToggleCardEdit>
            </ToggleCard>
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
                {(customer: ShopperCustomersTypes.Customer | null) => <AccountDetailsContent customer={customer} />}
            </Await>
        </Suspense>
    );
}
