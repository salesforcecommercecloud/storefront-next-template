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

import { buildSitePath } from '../utils/url-utils';

const { I } = inject();

/**
 * Passwordless Login Page Object
 */
class PasswordlessLoginPage {
    locators = {
        loginHeading: locate('h2.text-3xl, h2.text-2xl').as('Login Heading'),
        emailInput: locate('input[type="email"], input[name="email"]').as('Email Input'),
        sendLoginLinkButton: locate('button[type="submit"]').as('Send Login Link Button'),
        cookieAcceptButton: locate('button:has-text("Accept"), button:has-text("Accept All"), button[id*="accept"]').as(
            'Cookie Accept Button'
        ),
    };

    navigate(baseUrl?: string, mode: 'passwordless' | 'password' = 'passwordless'): void {
        const targetUrl = baseUrl || process.env.BASE_URL || 'http://localhost:5173';
        const modeParam = mode === 'password' ? '?mode=password' : '';
        I.amOnPage(new URL(buildSitePath(`/login${modeParam}`), targetUrl).toString());
        I.waitForElement(this.locators.emailInput, 30);
    }

    validateLoginHeading(): void {
        I.waitForElement(this.locators.loginHeading, 10);
    }

    enterEmail(email: string): void {
        I.waitForElement(this.locators.emailInput, 10);
        I.fillField(this.locators.emailInput, email);
    }

    clickSendLoginLink(): void {
        I.waitForElement(this.locators.sendLoginLinkButton, 10);
        I.click(this.locators.sendLoginLinkButton);
    }

    async isEmailInputVisible(): Promise<boolean> {
        const count = await I.grabNumberOfVisibleElements(this.locators.emailInput);
        return count > 0;
    }

    async isSendLoginLinkButtonVisible(): Promise<boolean> {
        const count = await I.grabNumberOfVisibleElements(this.locators.sendLoginLinkButton);
        return count > 0;
    }

    async getCurrentUrl(): Promise<string> {
        return await I.grabCurrentUrl();
    }

    async dismissCookieDialog(): Promise<void> {
        const cookieButtonCount = await I.grabNumberOfVisibleElements(this.locators.cookieAcceptButton);
        if (cookieButtonCount > 0) {
            I.click(this.locators.cookieAcceptButton);
        }
    }
}

// Export as singleton following CodeceptJS pattern
const passwordlessLoginPageInstance = new PasswordlessLoginPage();
export = passwordlessLoginPageInstance;
