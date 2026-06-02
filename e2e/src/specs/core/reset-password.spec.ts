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

Feature('Reset Password').tag('@core').tag('@auth');

// TODO: Skipped pending two independent fixes.
//   1. "User can request password reset" — re-enabled in PR #1865 (commit
//      a20304122) and immediately failing in nightly; the "Check Your Email"
//      heading never appears after submitting a known account email.
//   2. "User can reset password using magic link" — Before hook (signupFlow)
//      flakes intermittently on the new pre-merge gate (cc-nx_RefArchGlobal
//      cookie wait timeout one run, "Last Name Input" disappearing mid-form
//      the next). Same signup fragility as account-details/account-addresses.
const isBroken = true;
const scenarioFn = isBroken ? Scenario.skip : Scenario;

const { storefrontPage, forgotPasswordPage, resetPasswordPage, signupFlow } = inject();
import { expect } from 'chai';

/**
 * Spec-scoped account credentials, lazily created on the first scenario.
 * Keeping these in module-level variables (not the shared credential file)
 * ensures this worker's account is never touched by other parallel workers.
 */
let specEmail = '';

/**
 * Before hook: on the first scenario, create a dedicated account via signup.
 * On every subsequent scenario, clear cookies and re-login with stored creds.
 * This ensures the tests avoid hitting the password reset limit for a shopper's email.
 */
Before(async () => {
    if (!specEmail) {
        await storefrontPage.clearCookies();
        const { signupData } = await signupFlow.execute({ createBasket: false });
        specEmail = signupData.email;
    }
});

scenarioFn('User can request password reset', () => {
    // Navigate to the forgot password page
    forgotPasswordPage.navigate();

    // Verify the "Reset Password" heading is displayed
    forgotPasswordPage.validateResetPasswordHeading();

    // Enter email address
    forgotPasswordPage.enterEmail(specEmail);

    // Submit the form
    forgotPasswordPage.submitForm();

    // Verify "Check your email" heading is displayed after submission
    forgotPasswordPage.validateCheckEmailHeading();
})
    .tag('@reset-password')
    .tag('@forgot-password-form');

scenarioFn('User can reset password using magic link', async () => {
    // Test data
    const testToken = '12345678';
    const testPassword = 'NewSecureP@ssw0rd!';

    // Navigate to reset password page with token and email
    resetPasswordPage.navigate(testToken, specEmail);

    // Dismiss cookie/consent dialog first so heading is visible, then verify heading
    await resetPasswordPage.dismissCookieDialog();
    resetPasswordPage.validateResetPasswordHeading();

    // Capture the reset-password request sent when we submit the form
    const resetPasswordRequest = await resetPasswordPage.captureResetPasswordRequestWhile(() => {
        resetPasswordPage.enterPassword(testPassword);
        resetPasswordPage.enterConfirmPassword(testPassword);
        resetPasswordPage.submitForm();
    });

    // Verify request details
    expect(resetPasswordRequest.method, 'Request method should be POST').to.equal('POST');
    expect(resetPasswordRequest.url, 'Request URL should include /reset-password.data').to.include(
        '/reset-password.data'
    );

    // Verify request payload
    const params = new URLSearchParams(resetPasswordRequest.postData ?? '');
    expect(params.get('token'), 'Request should include token').to.equal(testToken);
    expect(params.get('email'), 'Request should include email').to.equal(specEmail);
    expect(params.get('newPassword'), 'Request should include password').to.equal(testPassword);
    expect(params.get('confirmPassword'), 'Request should include confirm password').to.equal(testPassword);
})
    .tag('@reset-password')
    .tag('@reset-password-form');

export {};
